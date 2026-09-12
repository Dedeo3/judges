import { hashToField } from "./field";
import { deriveCommitment } from "./commitment";
import { deriveNullifier } from "./nullifier";

/**
 * Builds the exact public+private signal set the Phase 5 circuit
 * (`prover/circuits/judges_membership.circom`) expects.
 *
 * The general `deriveCommitment`/`deriveNullifier` API allows their domain-ish string
 * parameters (`domainSeparator` vs `applicationId`) to differ; the circuit does not — it reuses
 * one `applicationIdHash` for both. This helper is the one place that enforces "same domain for
 * both", so a witness built here is always satisfiable by the circuit.
 */
export function deriveMembershipWitness(params: {
  credentialSecret: bigint;
  credentialPublicKey: string;
  applicationId: string;
  policyHash: bigint;
}) {
  const walletCommitment = deriveCommitment({
    credentialSecret: params.credentialSecret,
    credentialPublicKey: params.credentialPublicKey,
    domainSeparator: params.applicationId,
  });
  const nullifier = deriveNullifier({
    credentialSecret: params.credentialSecret,
    applicationId: params.applicationId,
  });

  return {
    // Public signals
    walletCommitment,
    nullifier,
    applicationIdHash: hashToField(params.applicationId),
    policyHash: params.policyHash,
    // Private witness
    credentialSecret: params.credentialSecret,
    credentialPublicKeyHash: hashToField(params.credentialPublicKey),
  };
}

/** JSON-serializable form (snarkjs' witness calculator expects decimal-string field elements). */
export function membershipWitnessToInputJson(witness: ReturnType<typeof deriveMembershipWitness>) {
  return Object.fromEntries(Object.entries(witness).map(([key, value]) => [key, value.toString()]));
}
