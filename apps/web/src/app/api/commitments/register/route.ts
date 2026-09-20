import { NextResponse } from "next/server";
import { registerCommitment } from "@/lib/commitments";

/**
 * Redesign B: register an identity commitment (Poseidon(secret)). The client derives the secret
 * from a wallet signature and sends only the commitment — the server never sees the secret.
 * Idempotent: re-registering the same commitment returns its existing leaf.
 *
 * The returned root must be posted on-chain (CommitmentTree.postRoot) before a proof against it
 * verifies. Gating who may register (e.g. requiring a completed passkey ceremony) is layered on
 * top of this in the ceremony flow; this route is the storage primitive.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.commitment !== "string") {
    return NextResponse.json({ ok: false, reason: "malformed_request" }, { status: 400 });
  }

  try {
    const result = await registerCommitment(body.commitment);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "invalid_commitment";
    return NextResponse.json({ ok: false, reason }, { status: 400 });
  }
}
