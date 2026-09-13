import { describe, expect, it } from "vitest";
import {
  buildConnectUrl,
  isConnectMessageFor,
  isValidAppId,
  isValidProofAppId,
  namespacedAppId,
  normalizeOrigin,
  parseConnectRequest,
  referrerMatchesOrigin,
} from "./connect";

const WALLET = "0x000000000000000000000000000000000000beef" as const;
const CONTEXT = `0x${"ab".repeat(32)}` as `0x${string}`;
const REQUEST_ID = "3f1c2b9a-7e4d-4b8a-9c1e-2d3f4a5b6c7d";

describe("normalizeOrigin", () => {
  it("accepts https origins and canonicalises them", () => {
    expect(normalizeOrigin("https://dapp.example")).toBe("https://dapp.example");
    expect(normalizeOrigin("https://dapp.example:8443")).toBe("https://dapp.example:8443");
    expect(normalizeOrigin("https://DAPP.example")).toBe("https://dapp.example");
  });

  it("drops the default port rather than treating it as a distinct origin", () => {
    expect(normalizeOrigin("https://dapp.example:443")).toBe("https://dapp.example");
  });

  it("accepts plain http only for loopback, so local dev works", () => {
    expect(normalizeOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(normalizeOrigin("http://127.0.0.1:4000")).toBe("http://127.0.0.1:4000");
    expect(normalizeOrigin("http://dapp.example")).toBeNull();
  });

  it("rejects anything that isn't a bare origin instead of coercing it into one", () => {
    expect(normalizeOrigin("https://dapp.example/path")).toBeNull();
    expect(normalizeOrigin("https://dapp.example/?x=1")).toBeNull();
    expect(normalizeOrigin("https://dapp.example/#frag")).toBeNull();
    expect(normalizeOrigin("https://user:pass@dapp.example")).toBeNull();
    expect(normalizeOrigin("javascript:alert(1)")).toBeNull();
    expect(normalizeOrigin("data:text/html,hi")).toBeNull();
    expect(normalizeOrigin("file:///etc/passwd")).toBeNull();
    expect(normalizeOrigin("null")).toBeNull();
    expect(normalizeOrigin("")).toBeNull();
    expect(normalizeOrigin(null)).toBeNull();
  });
});

describe("namespacedAppId", () => {
  it("prefixes the app id with the requesting origin", () => {
    expect(namespacedAppId("https://dapp.example", "airdrop")).toBe("https://dapp.example/airdrop");
  });

  /**
   * The core guarantee: two sites asking for the same app id get different namespaces, so one site
   * can never spend a user's nullifier inside another site's app.
   */
  it("gives different sites different namespaces for the same app id", () => {
    expect(namespacedAppId("https://evil.example", "airdrop")).not.toBe(
      namespacedAppId("https://dapp.example", "airdrop"),
    );
  });

  it("can't be escaped by crafting an app id that looks like another origin", () => {
    expect(() => namespacedAppId("https://evil.example", "https://dapp.example/airdrop")).toThrow();
    expect(() => namespacedAppId("https://evil.example", "../dapp")).toThrow();
  });

  it("rejects invalid origins", () => {
    expect(() => namespacedAppId("http://dapp.example", "airdrop")).toThrow();
  });
});

describe("isValidAppId", () => {
  it("accepts the ids the deployed demos use", () => {
    for (const id of ["judges-dao", "judges-agent-registry", "judges-faucet", "judges-demo"]) {
      expect(isValidAppId(id)).toBe(true);
    }
  });

  it("rejects separators, uppercase, empty, and overlong ids", () => {
    expect(isValidAppId("")).toBe(false);
    expect(isValidAppId("Airdrop")).toBe(false);
    expect(isValidAppId("a/b")).toBe(false);
    expect(isValidAppId("a:b")).toBe(false);
    expect(isValidAppId("-leading-dash")).toBe(false);
    expect(isValidAppId("a".repeat(65))).toBe(false);
  });
});

describe("isValidProofAppId", () => {
  it("accepts plain first-party ids", () => {
    expect(isValidProofAppId("judges-dao")).toBe(true);
  });

  it("accepts exactly what namespacedAppId produces", () => {
    expect(isValidProofAppId(namespacedAppId("https://dapp.example", "airdrop"))).toBe(true);
    expect(isValidProofAppId(namespacedAppId("http://localhost:4000", "airdrop"))).toBe(true);
  });

  it("rejects non-canonical or malformed namespaced ids", () => {
    expect(isValidProofAppId("https://dapp.example:443/airdrop")).toBe(false);
    expect(isValidProofAppId("https://DAPP.example/airdrop")).toBe(false);
    expect(isValidProofAppId("http://dapp.example/airdrop")).toBe(false);
    expect(isValidProofAppId("https://dapp.example/")).toBe(false);
    expect(isValidProofAppId("https://dapp.example/a/b")).toBe(false);
    expect(isValidProofAppId("https://dapp.example")).toBe(false);
    expect(isValidProofAppId("")).toBe(false);
  });
});

describe("parseConnectRequest", () => {
  const valid = () =>
    new URLSearchParams({
      origin: "https://dapp.example",
      appId: "airdrop",
      assurance: "user_verified",
      wallet: WALLET,
      requestId: REQUEST_ID,
      contextHash: CONTEXT,
    });

  it("round-trips a URL built by buildConnectUrl", () => {
    const url = new URL(
      buildConnectUrl("https://judges.example", {
        requestingOrigin: "https://dapp.example",
        appId: "airdrop",
        assurance: "user_verified",
        wallet: WALLET,
        contextHash: CONTEXT,
        requestId: REQUEST_ID,
      }),
    );
    expect(url.origin).toBe("https://judges.example");
    expect(url.pathname).toBe("/connect");

    const parsed = parseConnectRequest(url.searchParams);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value).toEqual({
        requestingOrigin: "https://dapp.example",
        appId: "airdrop",
        assurance: "user_verified",
        wallet: WALLET,
        contextHash: CONTEXT,
        requestId: REQUEST_ID,
      });
    }
  });

  it("treats contextHash as optional", () => {
    const params = valid();
    params.delete("contextHash");
    const parsed = parseConnectRequest(params);
    expect(parsed.ok && parsed.value.contextHash).toBeUndefined();
  });

  it.each([
    ["origin", "http://dapp.example"],
    ["origin", "https://dapp.example/path"],
    ["appId", "Airdrop"],
    ["appId", ""],
    ["assurance", "superuser"],
    ["wallet", "0x1234"],
    ["wallet", "not-an-address"],
    ["contextHash", "0x1234"],
    ["requestId", "short"],
    ["requestId", "has spaces in it ok?"],
  ])("rejects an invalid %s (%s)", (field, value) => {
    const params = valid();
    params.set(field, value);
    expect(parseConnectRequest(params).ok).toBe(false);
  });

  it.each(["origin", "appId", "assurance", "wallet", "requestId"])("rejects a missing %s", (field) => {
    const params = valid();
    params.delete(field);
    expect(parseConnectRequest(params).ok).toBe(false);
  });
});

describe("referrerMatchesOrigin", () => {
  it("accepts a referrer from the claimed origin", () => {
    expect(referrerMatchesOrigin("https://dapp.example/some/page?x=1", "https://dapp.example")).toBe(true);
  });

  it("rejects a referrer from a different origin — a site impersonating another's name", () => {
    expect(referrerMatchesOrigin("https://evil.example/", "https://dapp.example")).toBe(false);
    expect(referrerMatchesOrigin("https://dapp.example.evil.example/", "https://dapp.example")).toBe(false);
  });

  it("allows an empty referrer, which strict referrer policies legitimately produce", () => {
    expect(referrerMatchesOrigin("", "https://dapp.example")).toBe(true);
  });
});

describe("isConnectMessageFor", () => {
  it("accepts well-formed messages for this request", () => {
    expect(isConnectMessageFor({ type: "judges:proof", requestId: REQUEST_ID, proof: {} }, REQUEST_ID)).toBe(true);
    expect(isConnectMessageFor({ type: "judges:cancel", requestId: REQUEST_ID }, REQUEST_ID)).toBe(true);
    expect(isConnectMessageFor({ type: "judges:error", requestId: REQUEST_ID, reason: "x" }, REQUEST_ID)).toBe(true);
  });

  it("ignores messages meant for a different request", () => {
    expect(isConnectMessageFor({ type: "judges:proof", requestId: "other", proof: {} }, REQUEST_ID)).toBe(false);
  });

  it("ignores unrelated or malformed postMessage traffic", () => {
    expect(isConnectMessageFor(null, REQUEST_ID)).toBe(false);
    expect(isConnectMessageFor("judges:proof", REQUEST_ID)).toBe(false);
    expect(isConnectMessageFor({ type: "something-else", requestId: REQUEST_ID }, REQUEST_ID)).toBe(false);
    expect(isConnectMessageFor({ type: "judges:proof", requestId: REQUEST_ID }, REQUEST_ID)).toBe(false);
    expect(isConnectMessageFor({ type: "judges:error", requestId: REQUEST_ID }, REQUEST_ID)).toBe(false);
  });
});
