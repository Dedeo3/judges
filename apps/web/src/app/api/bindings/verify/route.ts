import { NextResponse } from "next/server";
import { verifyBinding } from "@/lib/binding";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.sessionId || !body?.walletSignature || !body?.response) {
    return NextResponse.json({ verified: false, reason: "malformed_request" }, { status: 400 });
  }

  const result = await verifyBinding({
    sessionId: body.sessionId,
    walletSignature: body.walletSignature,
    response: body.response,
  });

  return NextResponse.json(result, { status: result.verified ? 200 : 400 });
}
