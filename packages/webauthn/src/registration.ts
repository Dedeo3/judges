import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import type { ChallengeStore, CredentialStore, RpConfig } from "./types";

const DEFAULT_TTL_SECONDS = 300;

export async function createRegistrationOptions(params: {
  rp: RpConfig;
  sessionId: string;
  userId: string;
  label: string;
  challengeStore: ChallengeStore;
  ttlSeconds?: number;
}) {
  const options = await generateRegistrationOptions({
    rpName: params.rp.rpName,
    rpID: params.rp.rpId,
    userName: params.label,
    userID: new TextEncoder().encode(params.userId),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });

  await params.challengeStore.set(
    params.sessionId,
    { challenge: options.challenge, kind: "registration", userId: params.userId, label: params.label },
    params.ttlSeconds ?? DEFAULT_TTL_SECONDS,
  );

  return options;
}

export type RegistrationVerificationResult =
  | { verified: true; credentialId: string; userId: string }
  | { verified: false; reason: "no_pending_challenge" | "invalid_response" | "not_verified" };

export async function verifyRegistration(params: {
  rp: RpConfig;
  sessionId: string;
  response: RegistrationResponseJSON;
  challengeStore: ChallengeStore;
  credentialStore: CredentialStore;
}): Promise<RegistrationVerificationResult> {
  const pending = await params.challengeStore.consume(params.sessionId);
  if (!pending || pending.kind !== "registration" || !pending.userId) {
    return { verified: false, reason: "no_pending_challenge" };
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: params.response,
      expectedChallenge: pending.challenge,
      expectedOrigin: params.rp.origin,
      expectedRPID: params.rp.rpId,
      requireUserVerification: true,
    });
  } catch {
    return { verified: false, reason: "invalid_response" };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { verified: false, reason: "not_verified" };
  }

  const { credential } = verification.registrationInfo;

  await params.credentialStore.save({
    id: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    userId: pending.userId,
    rpId: params.rp.rpId,
    signCount: credential.counter,
    transports: credential.transports,
    status: "active",
    createdAt: new Date().toISOString(),
  });

  return { verified: true, credentialId: credential.id, userId: pending.userId };
}
