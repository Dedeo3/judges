import { Redis } from "@upstash/redis";
import { requireEnv } from "./env";

export interface PendingBinding {
  wallet: string;
  domain: string;
  nonce: string;
  message: string;
  challenge: string;
}

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

const keyFor = (sessionId: string) => `judges:binding:${sessionId}`;

export const bindingStore = {
  async set(sessionId: string, value: PendingBinding, ttlSeconds: number) {
    await getClient().set(keyFor(sessionId), value, { ex: ttlSeconds });
  },

  async consume(sessionId: string) {
    return getClient().getdel<PendingBinding>(keyFor(sessionId));
  },
};
