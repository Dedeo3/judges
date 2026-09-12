import { NextResponse } from "next/server";
import { proveMembership } from "@/lib/prove";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.sessionId || !body?.response || !body?.appId || !body?.assurance || !body?.wallet) {
    return NextResponse.json({ verified: false, reason: "malformed_request" }, { status: 400 });
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
