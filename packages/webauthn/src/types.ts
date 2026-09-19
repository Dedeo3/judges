export interface RpConfig {
  rpId: string;
  rpName: string;
  origin: string;
}

export interface PendingChallenge {
  challenge: string;
  kind: "registration" | "authentication";
  userId?: string;
  label?: string;
}

/** One-time-use challenge storage (Postgres-backed in production). */
export interface ChallengeStore {
  set(sessionId: string, value: PendingChallenge, ttlSeconds: number): Promise<void>;
  /** Fetch and delete atomically — enforces single-use, so replay after consumption fails. */
  consume(sessionId: string): Promise<PendingChallenge | null>;
}

export interface StoredCredential {
  id: string;
  publicKey: string;
  userId: string;
  rpId: string;
  signCount: number;
  transports?: string[];
  status: "active" | "revoked";
  createdAt: string;
}

export interface CredentialStore {
  save(credential: StoredCredential): Promise<void>;
  findById(credentialId: string): Promise<StoredCredential | null>;
  updateSignCount(credentialId: string, signCount: number): Promise<void>;
}
