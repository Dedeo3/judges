import { describe, expect, it } from "vitest";
import { deriveCredentialSecret } from "./commitment";
import { deriveNullifier } from "./nullifier";

const domainSecret = "test-domain-secret";
const credentialA = { credentialId: "cred-a", credentialPublicKey: "pubkey-a" };
const credentialB = { credentialId: "cred-b", credentialPublicKey: "pubkey-b" };

function secretFor(credential: { credentialId: string; credentialPublicKey: string }) {
  return deriveCredentialSecret({ domainSecret, ...credential });
}

describe("deriveNullifier", () => {
  it("is deterministic: same credential + same domain -> same nullifier", () => {
    const secret = secretFor(credentialA);
    const n1 = deriveNullifier({ credentialSecret: secret, applicationId: "dao-alpha" });
    const n2 = deriveNullifier({ credentialSecret: secret, applicationId: "dao-alpha" });
    expect(n1).toBe(n2);
  });

  it("differs across domains for the same credential", () => {
    const secret = secretFor(credentialA);
    const nA = deriveNullifier({ credentialSecret: secret, applicationId: "dao-alpha" });
    const nB = deriveNullifier({ credentialSecret: secret, applicationId: "dao-beta" });
    expect(nA).not.toBe(nB);
  });

  it("differs across credentials within the same domain", () => {
    const secretA = secretFor(credentialA);
    const secretB = secretFor(credentialB);
    const nA = deriveNullifier({ credentialSecret: secretA, applicationId: "dao-alpha" });
    const nB = deriveNullifier({ credentialSecret: secretB, applicationId: "dao-alpha" });
    expect(nA).not.toBe(nB);
  });

  it("differs across epochs for the same credential and domain", () => {
    const secret = secretFor(credentialA);
    const epoch1 = deriveNullifier({ credentialSecret: secret, applicationId: "faucet", epoch: 1 });
    const epoch2 = deriveNullifier({ credentialSecret: secret, applicationId: "faucet", epoch: 2 });
    expect(epoch1).not.toBe(epoch2);
  });

  it("produces a value within the BN254 scalar field", () => {
    const secret = secretFor(credentialA);
    const n = deriveNullifier({ credentialSecret: secret, applicationId: "dao-alpha" });
    const FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    expect(n).toBeGreaterThanOrEqual(0n);
    expect(n).toBeLessThan(FIELD_PRIME);
  });
});
