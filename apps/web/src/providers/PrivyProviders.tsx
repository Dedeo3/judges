"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { chain } from "@/lib/judgesConfig";
import { StubWalletBridge } from "@/lib/judgesWalletContext";
import { PrivyWalletBridge } from "@/lib/useJudgesWallet";

/**
 * Wallet-only Privy: no email/SMS/social login, no embedded wallet auto-creation. Judges never
 * wants an account — just a wallet to sign the identity message and send transactions with.
 *
 * `NEXT_PUBLIC_PRIVY_APP_ID` is a build-time constant (Next.js inlines `process.env.NEXT_PUBLIC_*`
 * at build time), so this `if` compiles to exactly one branch — never a per-render decision. When
 * it's set, real `<PrivyProvider>` + `PrivyWalletBridge` back `useConnectJudgesWallet`. When it's
 * not (a fresh checkout before the dashboard app exists), `StubWalletBridge` backs it instead,
 * with `connect()` rejecting with a clear message — Privy's own `<PrivyProvider>` is never
 * mounted with a fake id, and `useConnectWallet` is never called without a real provider around it
 * (it isn't written to handle that and crashes rather than erroring).
 */
export function PrivyProviders({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return <StubWalletBridge>{children}</StubWalletBridge>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["wallet"],
        embeddedWallets: { ethereum: { createOnLogin: "off" } },
        defaultChain: chain,
        supportedChains: [chain],
        appearance: {
          theme: "light",
          accentColor: "#15130F",
          walletChainType: "ethereum-only",
        },
      }}
    >
      <PrivyWalletBridge>{children}</PrivyWalletBridge>
    </PrivyProvider>
  );
}
