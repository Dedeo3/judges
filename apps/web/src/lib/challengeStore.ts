import type { ChallengeStore, PendingChallenge } from "@judges/webauthn";
import { putEphemeral, takeEphemeral } from "./ephemeralState";

const keyFor = (sessionId: string) => `judges:challenge:${sessionId}`;

export const challengeStore: ChallengeStore = {
  async set(sessionId, value, ttlSeconds) {
    await putEphemeral(keyFor(sessionId), value, ttlSeconds);
  },

  async consume(sessionId) {
    return takeEphemeral<PendingChallenge>(keyFor(sessionId));
  },
};
