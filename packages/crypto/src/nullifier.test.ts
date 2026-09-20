import { describe, expect, it } from "vitest";
import { deriveIdentitySecret } from "./identity";
import { deriveNullifier } from "./nullifier";

// Redesign B secrets: derived from (distinct) wallet signatures, not a server HMAC.
const secretA = deriveIdentitySecret(`0x${"a1".repeat(65)}`);
const secretB = deriveIdentitySecret(`0x${"b2".repeat(65)}`);

describe("deriveNullifier", () => {
  it("is deterministic: same secret + same domain -> same nullifier", () => {
    const n1 = deriveNullifier({ credentialSecret: secretA, applicationId: "dao-alpha" });
    const n2 = deriveNullifier({ credentialSecret: secretA, applicationId: "dao-alpha" });
    expect(n1).toBe(n2);
  });

  it("differs across domains for the same secret", () => {
    const nA = deriveNullifier({ credentialSecret: secretA, applicationId: "dao-alpha" });
    const nB = deriveNullifier({ credentialSecret: secretA, applicationId: "dao-beta" });
    expect(nA).not.toBe(nB);
  });

  it("differs across secrets within the same domain", () => {
    const nA = deriveNullifier({ credentialSecret: secretA, applicationId: "dao-alpha" });
    const nB = deriveNullifier({ credentialSecret: secretB, applicationId: "dao-alpha" });
    expect(nA).not.toBe(nB);
  });

  it("differs across epochs for the same secret and domain", () => {
    const epoch1 = deriveNullifier({ credentialSecret: secretA, applicationId: "faucet", epoch: 1 });
    const epoch2 = deriveNullifier({ credentialSecret: secretA, applicationId: "faucet", epoch: 2 });
    expect(epoch1).not.toBe(epoch2);
  });

  it("produces a value within the BN254 scalar field", () => {
    const n = deriveNullifier({ credentialSecret: secretA, applicationId: "dao-alpha" });
    const FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    expect(n).toBeGreaterThanOrEqual(0n);
    expect(n).toBeLessThan(FIELD_PRIME);
  });
});
