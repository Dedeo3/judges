"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ConnectedWalletResult } from "./wallet";

export type ConnectFn = () => Promise<ConnectedWalletResult>;
export type DisconnectFn = () => Promise<void>;
type WalletActions = { connect: ConnectFn; disconnect: DisconnectFn };

const JudgesWalletContext = createContext<WalletActions | null>(null);

/**
 * What every demo page actually calls. Reads from context rather than calling Privy's own
 * `useConnectWallet` directly, so it never needs to know whether Privy is configured — that
 * decision is made once, in `PrivyProviders`, by mounting either `PrivyWalletBridge` (real Privy
 * hook, see useJudgesWallet.ts) or `StubWalletBridge` (below) as this context's provider. Doing it
 * this way means no component here conditionally calls a Privy hook, which both avoids a
 * rules-of-hooks violation and avoids calling `useConnectWallet` when there's no `<PrivyProvider>`
 * around it to back it (Privy's hooks assume their provider is always present and crash, rather
 * than erroring, if it isn't).
 */
export function useConnectJudgesWallet(): ConnectFn {
  const actions = useContext(JudgesWalletContext);
  return (
    actions?.connect ??
    (() => Promise.reject(new Error("Wallet connect isn't configured (NEXT_PUBLIC_PRIVY_APP_ID is missing)")))
  );
}

export function useDisconnectJudgesWallet(): DisconnectFn {
  return useContext(JudgesWalletContext)?.disconnect ?? (() => Promise.resolve());
}

export function JudgesWalletContextProvider({ value, children }: { value: WalletActions; children: ReactNode }) {
  return <JudgesWalletContext.Provider value={value}>{children}</JudgesWalletContext.Provider>;
}

/** Mounted instead of `PrivyWalletBridge` when `NEXT_PUBLIC_PRIVY_APP_ID` isn't set. */
export function StubWalletBridge({ children }: { children: ReactNode }) {
  const value: WalletActions = {
    connect: () => Promise.reject(new Error("Wallet connect isn't configured (NEXT_PUBLIC_PRIVY_APP_ID is missing)")),
    disconnect: () => Promise.resolve(),
  };
  return <JudgesWalletContextProvider value={value}>{children}</JudgesWalletContextProvider>;
}
