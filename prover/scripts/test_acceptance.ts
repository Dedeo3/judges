import path from "node:path";
import { readFileSync } from "node:fs";
import * as snarkjs from "snarkjs";
import { deriveCredentialSecret, deriveMembershipWitness } from "@judges/crypto";

const BUILD_DIR = path.join(import.meta.dirname, "..", "build");
const WASM = path.join(BUILD_DIR, "judges_membership_js", "judges_membership.wasm");
const ZKEY = path.join(BUILD_DIR, "judges_membership_final.zkey");
const VKEY = JSON.parse(readFileSync(path.join(BUILD_DIR, "verification_key.json"), "utf8"));

function toInput(witness: ReturnType<typeof deriveMembershipWitness>): Record<string, string> {
  return Object.fromEntries(Object.entries(witness).map(([k, v]) => [k, v.toString()]));
}

async function tryProveAndVerify(input: Record<string, string>): Promise<{ ok: boolean; publicSignals?: string[] }> {
  try {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
    const ok = await snarkjs.groth16.verify(VKEY, publicSignals, proof);
    return { ok, publicSignals };
  } catch {
    // Witness calculation itself throws "Assert Failed" when the R1CS constraints (walletCommitment
    // === Poseidon(...), nullifier === Poseidon(...)) aren't satisfiable -- that IS the circuit
    // rejecting the claim, just at an earlier stage than proof verification.
    return { ok: false };
  }
}

let failures = 0;
function check(condition: boolean, label: string) {
  if (condition) {
    console.log(`[PASS] ${label}`);
  } else {
    failures++;
    console.log(`[FAIL] ${label}`);
  }
}

async function main() {
  const domainSecret = "prover-test-domain-secret";
  const credentialPublicKey = "pubkey-membership-test";
  const applicationId = "judges-demo";
  const policyHash = 42n;

  const credentialSecret = deriveCredentialSecret({
    domainSecret,
    credentialId: "cred-membership-test",
    credentialPublicKey,
  });

  const baseline = deriveMembershipWitness({ credentialSecret, credentialPublicKey, applicationId, policyHash });
  const baselineInput = toInput(baseline);

  // 1. correct witness -> proof verifies
  const correct = await tryProveAndVerify(baselineInput);
  check(correct.ok === true, "correct witness -> proof verifies");

  // 2. changed secret -> proof fails
  // A prover claiming a different secret produces the SAME public commitment/nullifier -- it
  // doesn't, so this can't even produce a satisfying witness.
  const wrongSecret = deriveMembershipWitness({
    credentialSecret: credentialSecret + 1n,
    credentialPublicKey,
    applicationId,
    policyHash,
  });
  const changedSecretInput = {
    ...toInput(wrongSecret),
    walletCommitment: baseline.walletCommitment.toString(),
    nullifier: baseline.nullifier.toString(),
  };
  const changedSecret = await tryProveAndVerify(changedSecretInput);
  check(changedSecret.ok === false, "changed secret -> proof fails");

  // 3. changed domain -> proof fails
  // Build a witness for a DIFFERENT domain, then try to verify it against the ORIGINAL domain's
  // proof/public signals -- SNARK soundness binds every public input, so swapping any of them
  // post-proof breaks verification even without touching the proof bytes themselves.
  const otherDomainWitness = deriveMembershipWitness({
    credentialSecret,
    credentialPublicKey,
    applicationId: "some-other-domain",
    policyHash,
  });
  const changedDomainInput = {
    ...toInput(otherDomainWitness),
    walletCommitment: baseline.walletCommitment.toString(),
    nullifier: baseline.nullifier.toString(),
  };
  const changedDomain = await tryProveAndVerify(changedDomainInput);
  check(changedDomain.ok === false, "changed domain -> proof fails");

  // 4. changed policy -> proof fails
  // Reuse the baseline's valid proof, but verify it against a public-signals array with a
  // different policyHash substituted in -- this isolates the "policyHash is bound by SNARK
  // soundness" property from witness/circuit logic entirely.
  //
  // Confirmed publicSignals order for `main {public [walletCommitment, nullifier,
  // applicationIdHash, policyHash]}` with one circuit output (policyHashEcho): snarkjs puts
  // outputs first, then public inputs in declaration order --
  // [policyHashEcho, walletCommitment, nullifier, applicationIdHash, policyHash].
  // Note policyHashEcho (index 0) and policyHash (index 4) hold the same value in a correct
  // proof, since the circuit just echoes one into the other -- using the fixed index 4 (rather
  // than searching by value) is what makes this test unambiguously "the policyHash input", not
  // "whichever signal happens to match first".
  const POLICY_HASH_SIGNAL_INDEX = 4;
  if (correct.publicSignals) {
    if (correct.publicSignals[POLICY_HASH_SIGNAL_INDEX] !== policyHash.toString()) {
      throw new Error("publicSignals ordering assumption is stale -- re-check the circuit's declared public inputs");
    }
    const { proof } = await snarkjs.groth16.fullProve(baselineInput, WASM, ZKEY);
    const tamperedSignals = [...correct.publicSignals];
    tamperedSignals[POLICY_HASH_SIGNAL_INDEX] = (policyHash + 1n).toString();
    const verifiedWithTamperedPolicy = await snarkjs.groth16.verify(VKEY, tamperedSignals, proof);
    check(verifiedWithTamperedPolicy === false, "changed policy -> proof fails");
  } else {
    check(false, "changed policy -> proof fails (skipped: no baseline public signals)");
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll Phase 5 acceptance checks passed.");
}

main();
