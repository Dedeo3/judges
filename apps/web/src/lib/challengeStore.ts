import { Redis } from "@upstash/redis";
import type { ChallengeStore, PendingChallenge } from "@judges/webauthn";
import { requireEnv } from "./env";

let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    client = new Redis({
      url: requireEnv("UPSTASH_REDIS_REST_URL"),
      token: requireEnv("UPSTASH_REDIS_REST_TOKEN"),
    });
  }
  return client;
}

const keyFor = (sessionId: string) => `judges:challenge:${sessionId}`;

export const redisChallengeStore: ChallengeStore = {
  async set(sessionId, value, ttlSeconds) {
    await getClient().set(keyFor(sessionId), value, { ex: ttlSeconds });
  },

  async consume(sessionId) {
    // GETDEL is atomic — enforces single-use without a separate delete race.
    return getClient().getdel<PendingChallenge>(keyFor(sessionId));
  },
};
