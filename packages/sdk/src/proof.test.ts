import { describe, expect, it } from "vitest";
import { assertProofMatchesRequest, toJudgesProof } from "./proof";

const WALLET = "0x000000000000000000000000000000000000beef";
const B32 = (b: string) => `0x${b.repeat(32)}`;

function validResponse() {
  return {
    verified: true,
    proof: `0x${"11".repeat(256)}`,
    merkleRoot: B32("22"),
    nullifier: B32("33"),
    domain: B32("44"),
    contextHash: B32("55"),
    wallet: WALLET,
    appId: "https://dapp.example/airdrop",
  };
}

describe("toJudgesProof", () => {
  it("accepts a well-formed response", () => {
    const proof = toJudgesProof(validResponse(), "user_verified", null);
    expect(proof.appId).toBe("https://dapp.example/airdrop");
    expect(proof.wallet).toBe(WALLET);
    expect(proof.assurance).toBe("user_verified");
  });

  it("uses the fallback app id in same-origin mode", () => {
    const { appId: _ignored, ...rest } = validResponse();
    expect(toJudgesProof(rest, "user_verified", "judges-demo").appId).toBe("judges-demo");
  });

  it("requires the popup to report an app id when there's no fallback", () => {
    const { appId: _ignored, ...rest } = validResponse();
    expect(() => toJudgesProof(rest, "user_verified", null)).toThrow(/malformed/);
  });

  it("surfaces the server's rejection reason", () => {
    expect(() => toJudgesProof({ verified: false, reason: "counter_regression" }, "user_verified", null)).toThrow(
      /counter_regression/,
    );
  });

  it.each([
    ["proof", "0x1234"],
    ["proof", `0x${"11".repeat(255)}`],
    ["merkleRoot", "0x22"],
    ["nullifier", "not-hex"],
    ["domain", B32("zz")],
    ["contextHash", ""],
    ["wallet", "0x1234"],
  ])("rejects a malformed %s rather than passing it on to an on-chain call", (field, value) => {
    const response = { ...validResponse(), [field]: value };
    expect(() => toJudgesProof(response, "user_verified", null)).toThrow(/malformed/);
  });
});

describe("assertProofMatchesRequest", () => {
  const proof = () => toJudgesProof(validResponse(), "user_verified", null);

  it("passes when everything matches, case-insensitively for hex", () => {
    expect(() =>
      assertProofMatchesRequest(proof(), {
        appId: "https://dapp.example/airdrop",
        wallet: WALLET.toUpperCase().replace("0X", "0x"),
        contextHash: B32("55").toUpperCase().replace("0X", "0x"),
      }),
    ).not.toThrow();
  });

  it("rejects a proof for a different app namespace", () => {
    expect(() =>
      assertProofMatchesRequest(proof(), { appId: "https://other.example/airdrop", wallet: WALLET }),
    ).toThrow(/app/);
  });

  it("rejects a proof bound to a different wallet", () => {
    expect(() =>
      assertProofMatchesRequest(proof(), {
        appId: "https://dapp.example/airdrop",
        wallet: "0x1111111111111111111111111111111111111111",
      }),
    ).toThrow(/bound to/);
  });

  it("rejects a proof bound to a different action when one was requested", () => {
    expect(() =>
      assertProofMatchesRequest(proof(), {
        appId: "https://dapp.example/airdrop",
        wallet: WALLET,
        contextHash: B32("99"),
      }),
    ).toThrow(/different action/);
  });

  it("doesn't constrain the action when none was requested", () => {
    expect(() =>
      assertProofMatchesRequest(proof(), { appId: "https://dapp.example/airdrop", wallet: WALLET }),
    ).not.toThrow();
  });
});
