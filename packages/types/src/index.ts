export type AssuranceLevel = "possession" | "user_verified" | "unique";

export interface VerificationPolicy {
  requireUserVerification: boolean;
  requireHardwareBacked: boolean;
  requireUnique: boolean;
  domain: string;
}

export interface ProveRequest {
  assurance: AssuranceLevel;
}

export interface VerifyResult {
  valid: boolean;
  assurance: {
    userVerified: boolean;
    hardwareBacked: boolean;
    unique: boolean;
  };
  nullifier: string;
  domain: string;
  expiresAt: number;
}
