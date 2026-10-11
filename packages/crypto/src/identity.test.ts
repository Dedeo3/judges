import { describe, expect, it } from "vitest";
import { poseidon1 } from "poseidon-lite";
import { deriveIdentityCommitment, deriveIdentitySecret, JUDGES_IDENTITY_MESSAGE } from "./identity";
import { FIELD_PRIME } from "./field";

const SIGNATURE = `0x${"ab".repeat(65)}` as const; // EIP-191 personal_sign is 65 bytes.

describe("deriveIdentitySecret", () => {
  it("is deterministic for the same signature", () => {
    expect(deriveIdentitySecret(SIGNATURE)).toBe(deriveIdentitySecret(SIGNATURE));
  });

  it("accepts hex and raw bytes identically", () => {
    const bytes = new Uint8Array(65).fill(0xab);
    expect(deriveIdentitySecret(SIGNATURE)).toBe(deriveIdentitySecret(bytes));
  });

  it("stays inside the field", () => {
    expect(deriveIdentitySecret(SIGNATURE)).toBeLessThan(FIELD_PRIME);
  });

  it("differs when the signature differs", () => {
    const other = `0x${"cd".repeat(65)}` as const;
    expect(deriveIdentitySecret(SIGNATURE)).not.toBe(deriveIdentitySecret(other));
  });

  it("rejects an empty or malformed signature", () => {
    expect(() => deriveIdentitySecret("0x" as `0x${string}`)).toThrow();
    expect(() => deriveIdentitySecret("0xabc" as `0x${string}`)).toThrow();
    expect(() => deriveIdentitySecret("nothex" as `0x${string}`)).toThrow();
  });
});

describe("deriveIdentityCommitment", () => {
  it("equals Poseidon(secret)", () => {
    const secret = deriveIdentitySecret(SIGNATURE);
    expect(deriveIdentityCommitment(secret)).toBe(poseidon1([secret]));
  });

  it("is deterministic", () => {
    const secret = deriveIdentitySecret(SIGNATURE);
    expect(deriveIdentityCommitment(secret)).toBe(deriveIdentityCommitment(secret));
  });
});

describe("JUDGES_IDENTITY_MESSAGE", () => {
  it("is a fixed, non-empty, versioned message", () => {
    expect(JUDGES_IDENTITY_MESSAGE).toContain("Judges Identity Key v1");
  });
});
