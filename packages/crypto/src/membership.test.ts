import { describe, expect, it } from "vitest";
import { deriveCommitment, deriveCredentialSecret } from "./commitment";
import { deriveMembershipWitness } from "./membership";
import { deriveNullifier } from "./nullifier";

describe("deriveMembershipWitness", () => {
  const credentialSecret = deriveCredentialSecret({
    domainSecret: "test-domain-secret",
    credentialId: "cred-a",
    credentialPublicKey: "pubkey-a",
  });

  it("matches deriveCommitment/deriveNullifier when the same domain is used for both", () => {
    const witness = deriveMembershipWitness({
      credentialSecret,
      credentialPublicKey: "pubkey-a",
      applicationId: "judges-demo",
      policyHash: 42n,
    });

    const expectedCommitment = deriveCommitment({
      credentialSecret,
      credentialPublicKey: "pubkey-a",
      domainSeparator: "judges-demo",
    });
    const expectedNullifier = deriveNullifier({ credentialSecret, applicationId: "judges-demo" });

    expect(witness.walletCommitment).toBe(expectedCommitment);
    expect(witness.nullifier).toBe(expectedNullifier);
    expect(witness.policyHash).toBe(42n);
  });

  it("is deterministic", () => {
    const w1 = deriveMembershipWitness({
      credentialSecret,
      credentialPublicKey: "pubkey-a",
      applicationId: "judges-demo",
      policyHash: 42n,
    });
    const w2 = deriveMembershipWitness({
      credentialSecret,
      credentialPublicKey: "pubkey-a",
      applicationId: "judges-demo",
      policyHash: 42n,
    });
    expect(w1).toEqual(w2);
  });

  it("changes commitment and nullifier when the domain changes", () => {
    const w1 = deriveMembershipWitness({
      credentialSecret,
      credentialPublicKey: "pubkey-a",
      applicationId: "domain-1",
      policyHash: 42n,
    });
    const w2 = deriveMembershipWitness({
      credentialSecret,
      credentialPublicKey: "pubkey-a",
      applicationId: "domain-2",
      policyHash: 42n,
    });
    expect(w1.walletCommitment).not.toBe(w2.walletCommitment);
    expect(w1.nullifier).not.toBe(w2.nullifier);
  });
});
