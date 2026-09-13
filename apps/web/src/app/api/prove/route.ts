import { NextResponse } from "next/server";
import { ASSURANCE_LEVELS, isValidProofAppId, type AssuranceLevel } from "@judges/sdk";
import { proveMembership } from "@/lib/prove";

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const BYTES32_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.sessionId || !body?.response || !body?.appId || !body?.assurance || !body?.wallet) {
    return NextResponse.json({ verified: false, reason: "malformed_request" }, { status: 400 });
  }

  // Validate before any of these reach the domain hash or the circuit witness. The app id is
  // either a first-party id or one namespaced by the /connect popup — see isValidProofAppId.
  if (typeof body.appId !== "string" || !isValidProofAppId(body.appId)) {
    return NextResponse.json({ verified: false, reason: "invalid_app_id" }, { status: 400 });
  }
  if (!ASSURANCE_LEVELS.includes(body.assurance as AssuranceLevel)) {
    return NextResponse.json({ verified: false, reason: "invalid_assurance" }, { status: 400 });
  }
  if (typeof body.wallet !== "string" || !ADDRESS_PATTERN.test(body.wallet)) {
    return NextResponse.json({ verified: false, reason: "invalid_wallet" }, { status: 400 });
  }
  if (body.contextHash !== undefined && (typeof body.contextHash !== "string" || !BYTES32_PATTERN.test(body.contextHash))) {
    return NextResponse.json({ verified: false, reason: "invalid_context_hash" }, { status: 400 });
  }

  const result = await proveMembership({
    sessionId: body.sessionId,
    response: body.response,
    appId: body.appId,
    assurance: body.assurance,
    wallet: body.wallet,
    contextHash: body.contextHash,
  });

  return NextResponse.json(result, { status: result.verified ? 200 : 400 });
}
