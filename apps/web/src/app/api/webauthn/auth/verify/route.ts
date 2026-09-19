import { NextResponse } from "next/server";
import { verifyAuthentication } from "@judges/webauthn";
import { rpConfig } from "@/lib/env";
import { challengeStore } from "@/lib/challengeStore";
import { neonCredentialStore } from "@/lib/credentialStore";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.sessionId || !body?.response) {
    return NextResponse.json({ verified: false, reason: "malformed_request" }, { status: 400 });
  }

  const result = await verifyAuthentication({
    rp: rpConfig,
    sessionId: body.sessionId,
    response: body.response,
    challengeStore: challengeStore,
    credentialStore: neonCredentialStore,
  });

  return NextResponse.json(result, { status: result.verified ? 200 : 400 });
}
