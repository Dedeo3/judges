import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createBindingChallenge } from "@/lib/binding";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.wallet !== "string" || typeof body?.domain !== "string") {
    return NextResponse.json({ error: "wallet and domain are required" }, { status: 400 });
  }

  const sessionId = randomUUID();
  const { options, message } = await createBindingChallenge({
    sessionId,
    wallet: body.wallet,
    domain: body.domain,
  });

  return NextResponse.json({ sessionId, options, message });
}
