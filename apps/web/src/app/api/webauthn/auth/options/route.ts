import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAuthenticationOptions } from "@judges/webauthn";
import { rpConfig } from "@/lib/env";
import { redisChallengeStore } from "@/lib/challengeStore";

export async function POST() {
  const sessionId = randomUUID();

  const options = await createAuthenticationOptions({
    rp: rpConfig,
    sessionId,
    challengeStore: redisChallengeStore,
  });

  return NextResponse.json({ sessionId, options });
}
