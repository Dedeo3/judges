import { NextResponse } from "next/server";
import { verifyAuthentication } from "@judges/webauthn";
import { registerCommitment } from "@/lib/commitments";
import { rpConfig } from "@/lib/env";
import { challengeStore } from "@/lib/challengeStore";
import { neonCredentialStore } from "@/lib/credentialStore";

/**
 * Redesign B: register an identity commitment (Poseidon(secret)), gated by a passkey.
 *
 * The caller must present a fresh WebAuthn assertion from a registered credential — proof that a
 * user-verified passkey holder stands behind this registration (the humanity gate). Only then is
 * the commitment stored. The secret itself is derived client-side from a wallet signature and
 * never reaches the server; this route sees only the assertion and the commitment.
 *
 * Idempotent on the commitment: re-registering the same one returns its existing leaf. The
 * returned root must be posted on-chain (CommitmentTree.postRoot) before a proof against it
 * verifies.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.commitment !== "string" || !body.sessionId || !body.response) {
    return NextResponse.json({ ok: false, reason: "malformed_request" }, { status: 400 });
  }

  const auth = await verifyAuthentication({
    rp: rpConfig,
    sessionId: body.sessionId,
    response: body.response,
    challengeStore,
    credentialStore: neonCredentialStore,
  });
  if (!auth.verified) {
    return NextResponse.json({ ok: false, reason: auth.reason }, { status: 401 });
  }

  try {
    const result = await registerCommitment(body.commitment);
    return NextResponse.json({ ok: true, credentialId: auth.credentialId, ...result });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "invalid_commitment";
    return NextResponse.json({ ok: false, reason }, { status: 400 });
  }
}
