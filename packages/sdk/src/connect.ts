/**
 * The cross-origin "connect" handshake, shared by both ends: the SDK running on an integrator's
 * site (which opens the popup) and Judges' own /connect page (which runs the passkey ceremony).
 * Keeping the validation in one module means the two ends can't disagree about what counts as
 * a valid request.
 *
 * Why a popup at all: passkeys are scoped to a relying party. A credential registered with
 * Judges can only be exercised on Judges' own origin, so a third-party site can't run the
 * ceremony itself. The popup runs it on Judges' origin and hands only the finished proof back.
 *
 * Threat model, in one line: a malicious site can open this popup and get a user to tap their
 * passkey. Two properties keep that harmless:
 *
 *  1. The app id is ALWAYS namespaced under the requesting origin. A site can only spend a
 *     user's nullifier inside its own namespace, never inside another site's airdrop or DAO.
 *     This needs no allowlist of integrators — it stays permissionless.
 *  2. The proof is posted back with `targetOrigin` set to the claimed requesting origin. If a
 *     site lies about its origin to borrow another site's namespace, the browser drops the
 *     message, because the real opener doesn't match — the liar never receives the proof.
 *
 * Neither consumes anything on its own: a nullifier is only spent when a proof is submitted
 * on-chain, and an undelivered proof never is.
 */
import type { AssuranceLevel } from "./types";

export const CONNECT_PATH = "/connect";

export const ASSURANCE_LEVELS: readonly AssuranceLevel[] = ["possession", "user_verified", "unique"];

const MAX_APP_ID_LENGTH = 64;
const APP_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const BYTES32_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const REQUEST_ID_PATTERN = /^[0-9a-zA-Z-]{16,64}$/;

/**
 * Canonical origin (`scheme://host[:port]`), or null if the value isn't a usable origin.
 *
 * https only — except plain http for loopback hosts, so local development works. Anything with a
 * path, query, credentials, or a non-web scheme is rejected rather than coerced: an origin is the
 * security boundary here, and "helpfully" normalising something ambiguous into one is how a
 * check like this gets bypassed.
 */
export function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.username || url.password) return null;
  if (url.pathname !== "/" || url.search || url.hash) return null;
  if (url.origin === "null") return null;

  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol === "https:") return url.origin;
  if (url.protocol === "http:" && isLoopback) return url.origin;
  return null;
}

/**
 * The app id actually used for proofs requested through the popup: the requesting origin, then
 * the site's own app id. This string is what an integrator's contract must be deployed with —
 * `domain = hashToField(namespacedAppId(origin, appId))`.
 */
export function namespacedAppId(requestingOrigin: string, appId: string): string {
  const origin = normalizeOrigin(requestingOrigin);
  if (!origin) throw new Error(`Invalid requesting origin: ${requestingOrigin}`);
  if (!isValidAppId(appId)) throw new Error(`Invalid app id: ${appId}`);
  return `${origin}/${appId}`;
}

export function isValidAppId(appId: string): boolean {
  return appId.length > 0 && appId.length <= MAX_APP_ID_LENGTH && APP_ID_PATTERN.test(appId);
}

/**
 * What the proving endpoint accepts: a plain app id (Judges' own first-party pages) or one
 * namespaced exactly as `namespacedAppId` produces (everything arriving via the popup). Anything
 * else — including a namespaced id whose origin part isn't canonical — is rejected, so no odd
 * string can reach the domain hash.
 */
export function isValidProofAppId(appId: string): boolean {
  if (isValidAppId(appId)) return true;

  const separator = appId.lastIndexOf("/");
  if (separator <= 0) return false;

  const origin = appId.slice(0, separator);
  const localId = appId.slice(separator + 1);
  return normalizeOrigin(origin) === origin && isValidAppId(localId);
}

export interface ConnectRequest {
  requestingOrigin: string;
  appId: string;
  assurance: AssuranceLevel;
  wallet: `0x${string}`;
  contextHash?: `0x${string}`;
  requestId: string;
}

export function buildConnectUrl(judgesOrigin: string, request: ConnectRequest): string {
  const origin = normalizeOrigin(judgesOrigin);
  if (!origin) throw new Error(`Invalid Judges origin: ${judgesOrigin}`);

  const params = new URLSearchParams({
    origin: request.requestingOrigin,
    appId: request.appId,
    assurance: request.assurance,
    wallet: request.wallet,
    requestId: request.requestId,
  });
  if (request.contextHash) params.set("contextHash", request.contextHash);

  return `${origin}${CONNECT_PATH}?${params.toString()}`;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: string };

/** Validates every field of an incoming connect request. Used by the /connect page. */
export function parseConnectRequest(params: URLSearchParams): ParseResult<ConnectRequest> {
  const requestingOrigin = normalizeOrigin(params.get("origin"));
  if (!requestingOrigin) return { ok: false, reason: "The requesting site's origin is missing or invalid." };

  const appId = params.get("appId") ?? "";
  if (!isValidAppId(appId)) {
    return { ok: false, reason: "The app id is missing or invalid (lowercase letters, digits, . _ -; max 64)." };
  }

  const assurance = params.get("assurance") as AssuranceLevel | null;
  if (!assurance || !ASSURANCE_LEVELS.includes(assurance)) {
    return { ok: false, reason: "The requested assurance level is not recognised." };
  }

  const wallet = params.get("wallet") ?? "";
  if (!ADDRESS_PATTERN.test(wallet)) return { ok: false, reason: "The wallet address is missing or invalid." };

  const contextHash = params.get("contextHash");
  if (contextHash !== null && !BYTES32_PATTERN.test(contextHash)) {
    return { ok: false, reason: "The action binding (contextHash) is not a valid 32-byte value." };
  }

  const requestId = params.get("requestId") ?? "";
  if (!REQUEST_ID_PATTERN.test(requestId)) return { ok: false, reason: "The request id is missing or invalid." };

  return {
    ok: true,
    value: {
      requestingOrigin,
      appId,
      assurance,
      wallet: wallet as `0x${string}`,
      contextHash: (contextHash ?? undefined) as `0x${string}` | undefined,
      requestId,
    },
  };
}

/**
 * Defence in depth for the consent screen, not the core guarantee: when the browser supplies a
 * referrer, it must agree with the origin the request claims. This stops a site from displaying
 * someone else's name ("https://trusted.example wants to verify you") to get a tap — which it
 * couldn't profit from anyway, since the proof would be posted to the real opener's mismatched
 * origin and dropped. An empty referrer (strict referrer policy) can't be checked and is allowed.
 */
export function referrerMatchesOrigin(referrer: string, claimedOrigin: string): boolean {
  if (!referrer) return true;
  try {
    return new URL(referrer).origin === claimedOrigin;
  } catch {
    return false;
  }
}

export type ConnectMessage =
  | { type: "judges:proof"; requestId: string; proof: unknown }
  | { type: "judges:error"; requestId: string; reason: string }
  | { type: "judges:cancel"; requestId: string };

/** Structural check on a message received by the opener, before trusting any field of it. */
export function isConnectMessageFor(data: unknown, requestId: string): data is ConnectMessage {
  if (typeof data !== "object" || data === null) return false;
  const message = data as Record<string, unknown>;
  if (message.requestId !== requestId) return false;
  if (message.type === "judges:proof") return "proof" in message;
  if (message.type === "judges:error") return typeof message.reason === "string";
  return message.type === "judges:cancel";
}

export function newRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
