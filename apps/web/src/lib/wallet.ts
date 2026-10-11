import { createPublicClient, createWalletClient, custom, http, type Address, type WalletClient } from "viem";
import { chain } from "./judgesConfig";

export function publicClient() {
  return createPublicClient({ chain, transport: http() });
}

export type ConnectedWalletResult = { account: Address; walletClient: WalletClient };

/**
 * Builds a viem WalletClient from any EIP-1193 provider (Privy's `getEthereumProvider()` included).
 * `useConnectJudgesWallet` (in `useJudgesWallet.ts`) is what call sites actually use to get here —
 * this helper just turns a connected wallet's provider into a viem client once Privy has one.
 */
export function walletClientFromProvider(
  account: Address,
  provider: Parameters<typeof custom>[0],
): WalletClient {
  return createWalletClient({ account, chain, transport: custom(provider) });
}
