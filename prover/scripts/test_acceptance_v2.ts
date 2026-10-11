import path from "node:path";
import { readFileSync } from "node:fs";
import * as snarkjs from "snarkjs";
import {
  assuranceContextHash,
  buildIdentityTree,
  deriveIdentityCommitment,
  deriveIdentitySecret,
  deriveMembershipV2WitnessFromTree,
  derivePolicyHashFromHex,
  generateCircuitMerkleProof,
  membershipV2WitnessToInputJson,
} from "@judges/crypto";

const BUILD_DIR = path.join(import.meta.dirname, "..", "build");
const WASM = path.join(BUILD_DIR, "judges_membership_v2_js", "judges_membership_v2.wasm");
const ZKEY = path.join(BUILD_DIR, "judges_membership_v2_final.zkey");
const VKEY = JSON.parse(readFileSync(path.join(BUILD_DIR, "verification_key_v2.json"), "utf8"));

// snarkjs public-signal order for judges_membership_v2.circom:
//   [policyHashEcho, merkleRoot, nullifier, applicationIdHash, policyHash]
const MERKLE_ROOT_INDEX = 1;
const POLICY_HASH_INDEX = 4;

function toHex32(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

async function tryProveAndVerify(input: Record<string, string | string[]>): Promise<{ ok: boolean; publicSignals?: string[] }> {
  try {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
    const ok = await snarkjs.groth16.verify(VKEY, publicSignals, proof);
    return { ok, publicSignals };
  } catch {
    // Witness calculation throws "Assert Failed" when the R1CS constraints aren't satisfiable --
    // that IS the circuit rejecting the claim, just earlier than proof verification.
    return { ok: false };
  }
}

let failures = 0;
function check(condition: boolean, label: string) {
  console.log(`${condition ? "[PASS]" : "[FAIL]"} ${label}`);
  if (!condition) failures++;
}

async function main() {
  const applicationId = "judges-demo";
  const wallet = "0x000000000000000000000000000000000000beef";
  const contextHash = toHex32(assuranceContextHash("user_verified"));
  const policyHash = derivePolicyHashFromHex({ contextHash, wallet });

  // A membership set of five registered identities.
  const secrets = ["11", "22", "33", "44", "55"].map((b) => deriveIdentitySecret(`0x${b.repeat(65)}`));
  const leaves = secrets.map(deriveIdentityCommitment);
  const tree = buildIdentityTree(leaves);

  // 1. a member's witness -> proof verifies
  const witness = deriveMembershipV2WitnessFromTree({ secret: secrets[2], applicationId, tree, policyHash });
  const baselineInput = membershipV2WitnessToInputJson(witness);
  const correct = await tryProveAndVerify(baselineInput);
  check(correct.ok === true, "member witness -> proof verifies");
  check(
    correct.publicSignals?.[MERKLE_ROOT_INDEX] === tree.root.toString(),
    "public merkleRoot signal equals the tree root",
  );

  // 2. a non-member cannot even build an inclusion proof (the core forgery-resistance property).
  let nonMemberThrew = false;
  try {
    const outsiderSecret = deriveIdentitySecret(`0x${"99".repeat(65)}`);
    generateCircuitMerkleProof(tree, deriveIdentityCommitment(outsiderSecret));
  } catch {
    nonMemberThrew = true;
  }
  check(nonMemberThrew, "non-member secret -> cannot produce an inclusion proof");

  // 3. tampered root -> proof fails (Groth16 soundness binds the public merkleRoot).
  if (correct.publicSignals) {
    const { proof } = await snarkjs.groth16.fullProve(baselineInput, WASM, ZKEY);
    const tampered = [...correct.publicSignals];
    tampered[MERKLE_ROOT_INDEX] = (BigInt(tampered[MERKLE_ROOT_INDEX]) + 1n).toString();
    const ok = await snarkjs.groth16.verify(VKEY, tampered, proof);
    check(ok === false, "tampered merkleRoot -> proof fails");
  } else {
    check(false, "tampered merkleRoot -> proof fails (skipped: no baseline signals)");
  }

  // 4. tampered policy -> proof fails.
  if (correct.publicSignals) {
    if (correct.publicSignals[POLICY_HASH_INDEX] !== policyHash.toString()) {
      throw new Error("publicSignals ordering assumption is stale -- re-check the circuit's public inputs");
    }
    const { proof } = await snarkjs.groth16.fullProve(baselineInput, WASM, ZKEY);
    const tampered = [...correct.publicSignals];
    tampered[POLICY_HASH_INDEX] = (policyHash + 1n).toString();
    const ok = await snarkjs.groth16.verify(VKEY, tampered, proof);
    check(ok === false, "tampered policyHash -> proof fails");
  } else {
    check(false, "tampered policyHash -> proof fails (skipped: no baseline signals)");
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll Redesign B acceptance checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
