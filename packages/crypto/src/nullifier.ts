import { poseidon3 } from "poseidon-lite";
import { hashToField } from "./field";

export const DEFAULT_EPOCH = "default";

/**
 * nullifier = Poseidon(credential_secret, applicationId, epoch) — README §7.5.
 * Poseidon for the same circuit-compatibility reason as the commitment (Phase 5's circuit
 * statement proves "the nullifier is correctly derived" alongside the commitment).
 *
 * Domain-separated: the same credential produces a different nullifier per `applicationId`, so
 * one application can't correlate a user's activity in another. `epoch` defaults to a fixed
 * value (no rotation) — time-boxed uniqueness (e.g. "once per day") is a policy decision for a
 * later phase, not a Phase 4 concern.
 */
export function deriveNullifier(params: {
  credentialSecret: bigint;
  applicationId: string;
  epoch?: string | number;
}): bigint {
  const applicationField = hashToField(params.applicationId);
  const epochField = hashToField(String(params.epoch ?? DEFAULT_EPOCH));
  return poseidon3([params.credentialSecret, applicationField, epochField]);
}
