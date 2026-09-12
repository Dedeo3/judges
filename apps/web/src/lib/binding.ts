import { createHash, randomBytes, randomUUID } from "node:crypto";
import { verifyMessage } from "viem";
import { generateAssertionOptions, verifyAssertion, type AuthenticationResponseJSON } from "@judges/webauthn";
import { rpConfig } from "./env";
import { neonCredentialStore } from "./credentialStore";
import { sql } from "./db";
import { bindingStore } from "./bindingStore";

const BINDING_TTL_SECONDS = 300;

function buildBindingMessage(params: { domain: string; wallet: string; nonce: string; expiresAt: string }) {
  return [
    "Judges Wallet Binding",
    `Domain: ${params.domain}`,
    `Wallet: ${params.wallet}`,
    `Nonce: ${params.nonce}`,
    `Expires: ${params.expiresAt}`,
  ].join("\n");
}

export async function createBindingChallenge(params: { sessionId: string; wallet: string; domain: string }) {
  const wallet = params.wallet.toLowerCase();
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + BINDING_TTL_SECONDS * 1000).toISOString();
  const message = buildBindingMessage({ domain: params.domain, wallet, nonce, expiresAt });
  const challengeBytes = createHash("sha256").update(message).digest();

  // The WebAuthn challenge is the hash of the exact wallet-signed statement,
  // so completing this ceremony cryptographically proves the same credential
  // authorizes this specific wallet+domain+nonce binding, not just "any" login.
  const options = await generateAssertionOptions({ rp: rpConfig, challenge: challengeBytes });

  await bindingStore.set(
    params.sessionId,
    { wallet, domain: params.domain, nonce, message, challenge: options.challenge },
    BINDING_TTL_SECONDS,
  );

  return { options, message };
}

export type BindingRejectReason =
  | "no_pending_challenge"
  | "invalid_wallet_signature"
  | "already_bound"
  | ReturnType<typeof mapAssertionReason>;

export type BindingResult =
  | { verified: true; wallet: string; credentialId: string; domain: string }
  | { verified: false; reason: BindingRejectReason };

function mapAssertionReason(reason: string) {
  return reason as "unknown_credential" | "invalid_response" | "not_verified" | "counter_regression";
}

export async function verifyBinding(params: {
  sessionId: string;
  walletSignature: `0x${string}`;
  response: AuthenticationResponseJSON;
}): Promise<BindingResult> {
  const pending = await bindingStore.consume(params.sessionId);
  if (!pending) {
    return { verified: false, reason: "no_pending_challenge" };
  }

  const signatureValid = await verifyMessage({
    address: pending.wallet as `0x${string}`,
    message: pending.message,
    signature: params.walletSignature,
  }).catch(() => false);

  if (!signatureValid) {
    return { verified: false, reason: "invalid_wallet_signature" };
  }

  const assertion = await verifyAssertion({
    rp: rpConfig,
    response: params.response,
    expectedChallenge: pending.challenge,
    credentialStore: neonCredentialStore,
  });

  if (!assertion.verified) {
    return { verified: false, reason: mapAssertionReason(assertion.reason) };
  }

  const existing = (await sql()`
    select wallet_address, credential_id from bindings
    where domain = ${pending.domain} and revoked_at is null
      and (credential_id = ${assertion.credentialId} or wallet_address = ${pending.wallet})
  `) as { wallet_address: string; credential_id: string }[];

  if (existing.length > 0) {
    const row = existing[0];
    const isSameBinding = row.credential_id === assertion.credentialId && row.wallet_address === pending.wallet;
    if (!isSameBinding) {
      return { verified: false, reason: "already_bound" };
    }
    return { verified: true, wallet: pending.wallet, credentialId: assertion.credentialId, domain: pending.domain };
  }

  try {
    await sql()`
      insert into bindings (id, credential_id, wallet_address, domain)
      values (${randomUUID()}, ${assertion.credentialId}, ${pending.wallet}, ${pending.domain})
    `;
  } catch {
    // Unique index race: another request bound this credential/wallet+domain first.
    return { verified: false, reason: "already_bound" };
  }

  return { verified: true, wallet: pending.wallet, credentialId: assertion.credentialId, domain: pending.domain };
}
