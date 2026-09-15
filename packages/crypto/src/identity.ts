import { poseidon1 } from "poseidon-lite";
import { hashBytesToField } from "./field";

/**
 * Redesign B (README task 2): the identity secret is derived on the CLIENT from a deterministic
 * wallet signature, never on the server. The server therefore never learns the secret and cannot
 * compute a user's nullifiers or link their activity — closing README §27.8. It also fixes the
 * separate, more serious hole that the pre-B on-chain verifier accepted a proof over any invented
 * secret (no membership check): in B the secret's commitment must be a leaf the server actually
 * inserted into the published tree (see `tree.ts`), which an outsider cannot forge.
 *
 * The user signs `JUDGES_IDENTITY_MESSAGE` once; the signature is hashed into the field. The
 * message is fixed (not per-app) because domain separation happens in the nullifier, not the
 * identity — one identity, many app-scoped nullifiers, exactly as in Semaphore.
 *
 * IMPORTANT determinism caveat (must be measured per README task 2): this relies on the wallet
 * producing the SAME signature for the same message every time. Standard EOAs (deterministic
 * ECDSA, RFC 6979) do; some smart-contract / MPC wallets may not. A wallet that re-randomises
 * its signature will derive a different secret each time and fail to reproduce its registered
 * commitment — callers should detect that by re-deriving the commitment at prove time and
 * comparing it to the one registered.
 */
export const JUDGES_IDENTITY_MESSAGE =
  "Judges Identity Key v1\n\n" +
  "Sign this message to create your private Judges identity.\n" +
  "This signature stays on your device, is never sent to any server, and is not a transaction.";

/**
 * Derive the field-element identity secret from the wallet's signature over
 * `JUDGES_IDENTITY_MESSAGE`. Accepts the 0x-hex signature (EIP-191 `personal_sign` output) or its
 * raw bytes. The signature bytes — not the hex text — are hashed.
 */
export function deriveIdentitySecret(signature: `0x${string}` | Uint8Array): bigint {
  const bytes = typeof signature === "string" ? signatureHexToBytes(signature) : signature;
  if (bytes.length === 0) {
    throw new Error("signature is empty");
  }
  return hashBytesToField(bytes);
}

/** identityCommitment = Poseidon(secret) — the leaf the server stores and inserts into the tree. */
export function deriveIdentityCommitment(secret: bigint): bigint {
  return poseidon1([secret]);
}

function signatureHexToBytes(value: string): Uint8Array {
  const normalized = value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
  if (normalized.length === 0 || normalized.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(normalized)) {
    throw new Error(`invalid signature hex: "${value}"`);
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
