import { createHash } from "node:crypto";
import { poseidon3 } from "poseidon-lite";
import { toField } from "./field";

const DEFAULT_EPOCH = "default";

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
  const applicationField = toField(createHash("sha256").update(params.applicationId).digest());
  const epochField = toField(createHash("sha256").update(String(params.epoch ?? DEFAULT_EPOCH)).digest());
  return poseidon3([params.credentialSecret, applicationField, epochField]);
}
