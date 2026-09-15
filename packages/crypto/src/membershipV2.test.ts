import { describe, expect, it } from "vitest";
import {
  deriveMembershipV2Witness,
  deriveMembershipV2WitnessFromTree,
  membershipV2WitnessToInputJson,
} from "./membershipV2";
import { buildIdentityTree, generateCircuitMerkleProof, MAX_TREE_DEPTH } from "./tree";
import { deriveIdentityCommitment, deriveIdentitySecret } from "./identity";
import { deriveNullifier } from "./nullifier";
import { hashToField } from "./field";

const secrets = [
  deriveIdentitySecret(`0x${"ab".repeat(65)}`),
  deriveIdentitySecret(`0x${"cd".repeat(65)}`),
  deriveIdentitySecret(`0x${"ef".repeat(65)}`),
];
const leaves = secrets.map(deriveIdentityCommitment);

describe("deriveMembershipV2Witness", () => {
  it("assembles public + private signals with the expected nullifier and root", () => {
    const tree = buildIdentityTree(leaves);
    const witness = deriveMembershipV2WitnessFromTree({
      secret: secrets[1],
      applicationId: "judges-dao",
      tree,
      policyHash: 42n,
    });

    expect(witness.merkleRoot).toBe(tree.root);
    expect(witness.applicationIdHash).toBe(hashToField("judges-dao"));
    expect(witness.policyHash).toBe(42n);
    expect(witness.nullifier).toBe(
      deriveNullifier({ credentialSecret: secrets[1], applicationId: "judges-dao" }),
    );
    expect(witness.indices).toHaveLength(MAX_TREE_DEPTH);
    expect(witness.siblings).toHaveLength(MAX_TREE_DEPTH);
  });

  it("gives different nullifiers across apps but the same root", () => {
    const tree = buildIdentityTree(leaves);
    const dao = deriveMembershipV2WitnessFromTree({ secret: secrets[0], applicationId: "judges-dao", tree, policyHash: 1n });
    const faucet = deriveMembershipV2WitnessFromTree({ secret: secrets[0], applicationId: "judges-faucet", tree, policyHash: 1n });
    expect(dao.nullifier).not.toBe(faucet.nullifier);
    expect(dao.merkleRoot).toBe(faucet.merkleRoot);
  });

  it("rejects a proof whose leaf doesn't match the secret", () => {
    const tree = buildIdentityTree(leaves);
    const proofForOther = generateCircuitMerkleProof(tree, leaves[0]);
    expect(() =>
      deriveMembershipV2Witness({
        secret: secrets[1], // mismatched secret
        applicationId: "judges-dao",
        merkleProof: proofForOther,
        policyHash: 1n,
      }),
    ).toThrow(/does not match/);
  });

  it("serializes to decimal strings with array signals preserved", () => {
    const tree = buildIdentityTree(leaves);
    const witness = deriveMembershipV2WitnessFromTree({ secret: secrets[2], applicationId: "judges-demo", tree, policyHash: 7n });
    const json = membershipV2WitnessToInputJson(witness);
    expect(json.policyHash).toBe("7");
    expect(Array.isArray(json.indices)).toBe(true);
    expect((json.indices as string[]).length).toBe(MAX_TREE_DEPTH);
    expect(typeof json.merkleRoot).toBe("string");
  });
});
