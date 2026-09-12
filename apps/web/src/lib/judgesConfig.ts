import { monad, monadTestnet } from "viem/chains";
import type { Address, Chain } from "viem";

/**
 * Client-side config for the deployed Judges stack.
 *
 * Addresses come from `NEXT_PUBLIC_*` env vars rather than being committed as constants, so the
 * same build works against a local anvil, testnet, and mainnet. `contracts/script/DeployJudges.s.sol`
 * writes a ready-to-paste block to `contracts/deployments/<chainId>.env` after a deploy.
 *
 * Chain definitions come from viem (`monadTestnet` = 10143, `monad` = 143) instead of being
 * hand-rolled — RPC URLs and explorer links included, and one less thing to keep correct.
 */
export type JudgesNetwork = "monad-testnet" | "monad-mainnet";

export const NETWORK: JudgesNetwork =
  (process.env.NEXT_PUBLIC_JUDGES_NETWORK as JudgesNetwork | undefined) ?? "monad-testnet";

export const chain: Chain = NETWORK === "monad-mainnet" ? monad : monadTestnet;

/**
 * The app-id strings each demo contract was deployed with. These must match
 * `DeployJudges.s.sol`'s constants exactly: the `appId` here becomes the circuit's
 * `applicationIdHash` public input, and the contract compares it against the `domain` it was
 * constructed with. `contracts/test/JudgesField.t.sol` pins both sides' hashing of these strings.
 */
export const APP_IDS = {
  dao: "judges-dao",
  agentRegistry: "judges-agent-registry",
  faucet: "judges-faucet",
} as const;

function optionalAddress(value: string | undefined): Address | null {
  if (!value) return null;
  return /^0x[0-9a-fA-F]{40}$/.test(value) ? (value as Address) : null;
}

export const addresses = {
  judgesVerifier: optionalAddress(process.env.NEXT_PUBLIC_JUDGES_VERIFIER_ADDRESS),
  dao: optionalAddress(process.env.NEXT_PUBLIC_JUDGES_DAO_ADDRESS),
  agentRegistry: optionalAddress(process.env.NEXT_PUBLIC_JUDGES_AGENT_REGISTRY_ADDRESS),
  faucet: optionalAddress(process.env.NEXT_PUBLIC_JUDGES_FAUCET_ADDRESS),
};

/** Human-readable reason a demo can't run yet, or null when it's fully configured. */
export function missingConfigReason(demo: keyof typeof APP_IDS): string | null {
  if (!addresses.judgesVerifier) return "NEXT_PUBLIC_JUDGES_VERIFIER_ADDRESS is not set";
  const key = demo === "dao" ? "dao" : demo === "faucet" ? "faucet" : "agentRegistry";
  if (!addresses[key]) {
    const envName =
      demo === "dao"
        ? "NEXT_PUBLIC_JUDGES_DAO_ADDRESS"
        : demo === "faucet"
          ? "NEXT_PUBLIC_JUDGES_FAUCET_ADDRESS"
          : "NEXT_PUBLIC_JUDGES_AGENT_REGISTRY_ADDRESS";
    return `${envName} is not set`;
  }
  return null;
}

export function explorerTxUrl(txHash: string): string | null {
  const base = chain.blockExplorers?.default?.url;
  return base ? `${base}/tx/${txHash}` : null;
}
