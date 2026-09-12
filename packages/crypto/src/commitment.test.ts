import { describe, expect, it } from "vitest";
import { deriveCommitment, deriveCredentialSecret } from "./commitment";

const domainSecret = "test-domain-secret";

describe("deriveCredentialSecret", () => {
  it("is deterministic for the same credential", () => {
    const s1 = deriveCredentialSecret({ domainSecret, credentialId: "cred-a", credentialPublicKey: "pubkey-a" });
    const s2 = deriveCredentialSecret({ domainSecret, credentialId: "cred-a", credentialPublicKey: "pubkey-a" });
    expect(s1).toBe(s2);
  });

  it("differs when the domain secret differs", () => {
    const s1 = deriveCredentialSecret({ domainSecret: "secret-1", credentialId: "cred-a", credentialPublicKey: "pubkey-a" });
    const s2 = deriveCredentialSecret({ domainSecret: "secret-2", credentialId: "cred-a", credentialPublicKey: "pubkey-a" });
    expect(s1).not.toBe(s2);
  });

  it("differs across credential IDs", () => {
    const s1 = deriveCredentialSecret({ domainSecret, credentialId: "cred-a", credentialPublicKey: "pubkey-a" });
    const s2 = deriveCredentialSecret({ domainSecret, credentialId: "cred-b", credentialPublicKey: "pubkey-a" });
    expect(s1).not.toBe(s2);
  });
});

describe("deriveCommitment", () => {
  const credentialSecret = deriveCredentialSecret({
    domainSecret,
    credentialId: "cred-a",
    credentialPublicKey: "pubkey-a",
  });

  it("is deterministic for the same inputs", () => {
    const c1 = deriveCommitment({ credentialSecret, credentialPublicKey: "pubkey-a", domainSeparator: "judges-demo" });
    const c2 = deriveCommitment({ credentialSecret, credentialPublicKey: "pubkey-a", domainSeparator: "judges-demo" });
    expect(c1).toBe(c2);
  });

  it("differs when the domain separator changes", () => {
    const c1 = deriveCommitment({ credentialSecret, credentialPublicKey: "pubkey-a", domainSeparator: "domain-1" });
    const c2 = deriveCommitment({ credentialSecret, credentialPublicKey: "pubkey-a", domainSeparator: "domain-2" });
    expect(c1).not.toBe(c2);
  });

  it("differs when the credential secret changes", () => {
    const otherSecret = deriveCredentialSecret({
      domainSecret,
      credentialId: "cred-b",
      credentialPublicKey: "pubkey-b",
    });
    const c1 = deriveCommitment({ credentialSecret, credentialPublicKey: "pubkey-a", domainSeparator: "judges-demo" });
    const c2 = deriveCommitment({
      credentialSecret: otherSecret,
      credentialPublicKey: "pubkey-a",
      domainSeparator: "judges-demo",
    });
    expect(c1).not.toBe(c2);
  });
});
