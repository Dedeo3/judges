import { describe, expect, it } from "vitest";
import { assuranceContextHash, derivePolicyHash, derivePolicyHashFromHex } from "./policy";
import { FIELD_PRIME } from "./field";

const walletA = "0x1111111111111111111111111111111111111111";
const walletB = "0x2222222222222222222222222222222222222222";
const contextA = `0x${"aa".repeat(32)}`;
const contextB = `0x${"bb".repeat(32)}`;

describe("derivePolicyHash", () => {
  it("is deterministic", () => {
    const h1 = derivePolicyHashFromHex({ contextHash: contextA, wallet: walletA });
    const h2 = derivePolicyHashFromHex({ contextHash: contextA, wallet: walletA });
    expect(h1).toBe(h2);
  });

  it("binds the wallet — same context, different wallet gives a different policy hash", () => {
    const forA = derivePolicyHashFromHex({ contextHash: contextA, wallet: walletA });
    const forB = derivePolicyHashFromHex({ contextHash: contextA, wallet: walletB });
    expect(forA).not.toBe(forB);
  });

  it("binds the action — same wallet, different context gives a different policy hash", () => {
    const ctx1 = derivePolicyHashFromHex({ contextHash: contextA, wallet: walletA });
    const ctx2 = derivePolicyHashFromHex({ contextHash: contextB, wallet: walletA });
    expect(ctx1).not.toBe(ctx2);
  });

  it("stays inside the BN254 scalar field", () => {
    const h = derivePolicyHashFromHex({ contextHash: contextA, wallet: walletA });
    expect(h).toBeGreaterThanOrEqual(0n);
    expect(h).toBeLessThan(FIELD_PRIME);
  });

  it("accepts a checksummed address identically to a lowercase one (bytes, not display strings)", () => {
    const lower = derivePolicyHashFromHex({
      contextHash: contextA,
      wallet: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    });
    const upper = derivePolicyHashFromHex({
      contextHash: contextA,
      wallet: "0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD",
    });
    expect(lower).toBe(upper);
  });

  it("rejects wrong-length inputs instead of silently hashing them", () => {
    expect(() => derivePolicyHash({ contextHash: new Uint8Array(31), wallet: new Uint8Array(20) })).toThrow();
    expect(() => derivePolicyHash({ contextHash: new Uint8Array(32), wallet: new Uint8Array(32) })).toThrow();
    expect(() => derivePolicyHashFromHex({ contextHash: "0x1234", wallet: walletA })).toThrow();
  });
});

describe("assuranceContextHash", () => {
  it("differs per assurance level", () => {
    expect(assuranceContextHash("user_verified")).not.toEqual(assuranceContextHash("possession"));
  });

  it("is a 32-byte digest usable directly as a contextHash", () => {
    const ctx = assuranceContextHash("user_verified");
    expect(ctx.length).toBe(32);
    expect(() => derivePolicyHash({ contextHash: ctx, wallet: new Uint8Array(20) })).not.toThrow();
  });
});
