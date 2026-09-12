import { createHash, createHmac } from "node:crypto";
import { poseidon3 } from "poseidon-lite";
import { toField } from "./field";

/**
 * Derives a per-credential secret from the server-held domain secret and the credential's
 * identity. We never have access to the WebAuthn private key itself (non-extractable by
 * design), so this HMAC — not the authenticator's key — is the "credential_secret" referenced
 * in README §7.4/§7.5. Deterministic per credential; requires JUDGES_DOMAIN_SECRET, so nobody
 * without that server secret can compute or forge a credential's secret, commitment, or
 * nullifier even knowing the (semi-public) credential ID and public key.
 */
export function deriveCredentialSecret(params: {
  domainSecret: string;
  credentialId: string;
  credentialPublicKey: string;
}): bigint {
  const hmac = createHmac("sha256", params.domainSecret)
    .update(params.credentialId)
    .update(params.credentialPublicKey)
    .digest();
  return toField(hmac);
}

/**
 * commitment = Poseidon(credential_secret, credential_public_key, domain_separator) — README §7.4.
 * Poseidon (not keccak/sha256) because this is the exact construction Phase 5's ZK circuit will
 * need to prove over; picking a circuit-unfriendly hash now would mean redoing this later.
 */
export function deriveCommitment(params: {
  credentialSecret: bigint;
  credentialPublicKey: string;
  domainSeparator: string;
}): bigint {
  const publicKeyField = toField(createHash("sha256").update(params.credentialPublicKey).digest());
  const domainField = toField(createHash("sha256").update(params.domainSeparator).digest());
  return poseidon3([params.credentialSecret, publicKeyField, domainField]);
}
