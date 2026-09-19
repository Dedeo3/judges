import { putEphemeral, takeEphemeral } from "./ephemeralState";

export interface PendingBinding {
  wallet: string;
  domain: string;
  nonce: string;
  message: string;
  challenge: string;
}

const keyFor = (sessionId: string) => `judges:binding:${sessionId}`;

export const bindingStore = {
  async set(sessionId: string, value: PendingBinding, ttlSeconds: number) {
    await putEphemeral(keyFor(sessionId), value, ttlSeconds);
  },

  async consume(sessionId: string) {
    return takeEphemeral<PendingBinding>(keyFor(sessionId));
  },
};
