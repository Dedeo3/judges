"use client";

import { useCallback, useMemo, useRef, type ReactNode } from "react";
import { useConnectWallet, useWallets } from "@privy-io/react-auth";
import type { Address } from "viem";
import { chain } from "./judgesConfig";
import { JudgesWalletContextProvider } from "./judgesWalletContext";
import { walletClientFromProvider, type ConnectedWalletResult } from "./wallet";

/**
 * Structural subset of Privy's connected-wallet object — just what this hook calls. Privy's own
 * EIP1193 provider type and viem's don't line up exactly on `on`/`removeListener` (both are
 * correct supersets of the real runtime shape), so `getEthereumProvider` is typed loosely here
 * and cast once, at the single point it's handed to viem's `custom()`.
 */
type MinimalConnectedWallet = {
  address: string;
  switchChain(chainId: number): Promise<unknown>;
  getEthereumProvider(): Promise<{ request(args: { method: string; params?: unknown[] }): Promise<unknown> }>;
};

/**
 * Only mounted (by `PrivyProviders`) when `NEXT_PUBLIC_PRIVY_APP_ID` is set, inside a real
 * `<PrivyProvider>`. Turns Privy's callback-shaped `useConnectWallet` into the one-shot
 * `await connect()` the demo pages expect (previously `connectWallet()` in wallet.ts, raw
 * `window.ethereum` only, MetaMask-only). Privy brings the wallet picker (MetaMask, WalletConnect,
 * Coinbase Wallet, Rainbow, any injected wallet) and turns wallet-rejection errors (plain
 * `{code, message}` objects under raw EIP-1193) into real `Error`s with a message — that mismatch
 * is what surfaced in production as an uncaught "Object" in the console.
 */
export function PrivyWalletBridge({ children }: { children: ReactNode }) {
  const pending = useRef<{
    resolve: (value: ConnectedWalletResult) => void;
    reject: (reason: Error) => void;
  } | null>(null);

  const settle = useCallback(async (wallet: MinimalConnectedWallet) => {
    const entry = pending.current;
    pending.current = null;
    if (!entry) return;
    try {
      await wallet.switchChain(chain.id);
      const provider = await wallet.getEthereumProvider();
      const account = wallet.address as Address;
      entry.resolve({
        account,
        walletClient: walletClientFromProvider(account, provider as Parameters<typeof walletClientFromProvider>[1]),
      });
    } catch (err) {
      entry.reject(err instanceof Error ? err : new Error("Could not switch the wallet to the right network"));
    }
  }, []);

  const { connectWallet } = useConnectWallet({
    onSuccess: ({ wallet }) => {
      if (!("getEthereumProvider" in wallet)) {
        pending.current?.reject(new Error("Connected wallet isn't an Ethereum wallet"));
        pending.current = null;
        return;
      }
      void settle(wallet);
    },
    onError: (error) => {
      const entry = pending.current;
      pending.current = null;
      entry?.reject(new Error(privyConnectErrorMessage(error)));
    },
  });

  const connect = useCallback(() => {
    return new Promise<ConnectedWalletResult>((resolve, reject) => {
      pending.current = { resolve, reject };
      connectWallet();
    });
  }, [connectWallet]);

  // Injected wallets (MetaMask, Rabby) may ignore a programmatic disconnect, so callers also drop
  // their own copy of the account; the next connect() re-reads whichever account the wallet has selected.
  const { wallets } = useWallets();
  const disconnect = useCallback(async () => {
    await Promise.allSettled(wallets.map(async (wallet) => wallet.disconnect()));
  }, [wallets]);

  const value = useMemo(() => ({ connect, disconnect }), [connect, disconnect]);
  return <JudgesWalletContextProvider value={value}>{children}</JudgesWalletContextProvider>;
}

function privyConnectErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "Wallet connection failed";
}
