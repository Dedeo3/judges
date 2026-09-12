import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, AuthenticatorTransportFuture } from "@simplewebauthn/types";
import type { ChallengeStore, CredentialStore, RpConfig } from "./types";

const DEFAULT_TTL_SECONDS = 300;

/**
 * Low-level assertion-options generator with no storage side effect, so
 * callers outside a plain login flow (e.g. wallet binding, Phase 2) can
 * supply their own challenge and manage its pending state themselves.
 */
export async function generateAssertionOptions(params: { rp: RpConfig; challenge?: string | Uint8Array }) {
  // No allowCredentials: discoverable (resident-key) credentials let the
  // authenticator surface which passkey to use, so the server doesn't need
  // to know the user's identity before the ceremony completes.
  return generateAuthenticationOptions({
    rpID: params.rp.rpId,
    userVerification: "required",
    challenge: params.challenge,
  });
}

export async function createAuthenticationOptions(params: {
  rp: RpConfig;
  sessionId: string;
  challengeStore: ChallengeStore;
  ttlSeconds?: number;
}) {
  const options = await generateAssertionOptions({ rp: params.rp });

  await params.challengeStore.set(
    params.sessionId,
    { challenge: options.challenge, kind: "authentication" },
    params.ttlSeconds ?? DEFAULT_TTL_SECONDS,
  );

  return options;
}

export type AssertionRejectReason =
  | "unknown_credential"
  | "invalid_response"
  | "not_verified"
  | "counter_regression";

export type AssertionVerificationResult =
  | { verified: true; credentialId: string; userId: string; userVerified: boolean }
  | { verified: false; reason: AssertionRejectReason };

/**
 * Core assertion verification against an already-known expected challenge.
 * Shared by plain login (`verifyAuthentication`, challenge from the login
 * ChallengeStore) and wallet binding (Phase 2, challenge derived from the
 * binding statement hash) so both get identical signature/counter checks.
 */
export async function verifyAssertion(params: {
  rp: RpConfig;
  response: AuthenticationResponseJSON;
  expectedChallenge: string;
  credentialStore: CredentialStore;
}): Promise<AssertionVerificationResult> {
  const stored = await params.credentialStore.findById(params.response.id);
  if (!stored || stored.status !== "active" || stored.rpId !== params.rp.rpId) {
    return { verified: false, reason: "unknown_credential" };
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: params.response,
      expectedChallenge: params.expectedChallenge,
      expectedOrigin: params.rp.origin,
      expectedRPID: params.rp.rpId,
      requireUserVerification: true,
      credential: {
        id: stored.id,
        publicKey: Buffer.from(stored.publicKey, "base64url"),
        counter: stored.signCount,
        transports: stored.transports as AuthenticatorTransportFuture[] | undefined,
      },
    });
  } catch {
    return { verified: false, reason: "invalid_response" };
  }

  if (!verification.verified) {
    return { verified: false, reason: "not_verified" };
  }

  const { newCounter } = verification.authenticationInfo;
  // Some authenticators never increment (always report 0); only enforce
  // monotonicity when the authenticator actually implements a counter.
  if (newCounter !== 0 && newCounter <= stored.signCount) {
    return { verified: false, reason: "counter_regression" };
  }

  await params.credentialStore.updateSignCount(stored.id, newCounter);

  return {
    verified: true,
    credentialId: stored.id,
    userId: stored.userId,
    userVerified: verification.authenticationInfo.userVerified,
  };
}

export type AuthenticationVerificationResult =
  | { verified: true; credentialId: string; userId: string; userVerified: boolean }
  | { verified: false; reason: "no_pending_challenge" | AssertionRejectReason };

export async function verifyAuthentication(params: {
  rp: RpConfig;
  sessionId: string;
  response: AuthenticationResponseJSON;
  challengeStore: ChallengeStore;
  credentialStore: CredentialStore;
}): Promise<AuthenticationVerificationResult> {
  const pending = await params.challengeStore.consume(params.sessionId);
  if (!pending || pending.kind !== "authentication") {
    return { verified: false, reason: "no_pending_challenge" };
  }

  return verifyAssertion({
    rp: params.rp,
    response: params.response,
    expectedChallenge: pending.challenge,
    credentialStore: params.credentialStore,
  });
}
