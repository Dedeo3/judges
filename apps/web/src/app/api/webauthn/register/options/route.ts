import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createRegistrationOptions } from "@judges/webauthn";
import { rpConfig } from "@/lib/env";
import { redisChallengeStore } from "@/lib/challengeStore";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : "judges-user";

  const sessionId = randomUUID();
  const userId = randomUUID();

  const options = await createRegistrationOptions({
    rp: rpConfig,
    sessionId,
    userId,
    label,
    challengeStore: redisChallengeStore,
  });

  return NextResponse.json({ sessionId, options });
}
