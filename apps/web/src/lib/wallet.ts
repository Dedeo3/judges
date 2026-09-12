import { createPublicClient, createWalletClient, custom, http, type Address, type WalletClient } from "viem";
import { chain } from "./judgesConfig";

export type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function publicClient() {
  return createPublicClient({ chain, transport: http() });
}

/**
 * Connects the injected wallet and makes sure it's on the right chain.
 *
 * Deliberately raw EIP-1193 rather than wagmi/RainbowKit: the demos need one account and one
 * chain, and a connector library would be a large dependency for that. A real integrator would
 * plug their own wallet stack in — the SDK takes any viem WalletClient.
 */
export async function connectWallet(): Promise<{ account: Address; walletClient: WalletClient }> {
  const provider = window.ethereum;
  if (!provider) {
    throw new Error("No injected wallet found (install MetaMask or similar)");
  }

  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as Address[];
  const account = accounts[0];
  if (!account) throw new Error("Wallet returned no accounts");

  await ensureChain(provider);

  return {
    account,
    walletClient: createWalletClient({ account, chain, transport: custom(provider) }),
  };
}

async function ensureChain(provider: EthereumProvider) {
  const chainIdHex = `0x${chain.id.toString(16)}`;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
  } catch (err) {
    // 4902 = chain unknown to the wallet. Add it, then the switch above is implicit.
    if ((err as { code?: number })?.code !== 4902) throw err;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainIdHex,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: chain.rpcUrls.default.http,
          blockExplorerUrls: chain.blockExplorers?.default ? [chain.blockExplorers.default.url] : undefined,
        },
      ],
    });
  }
}
