import { createPublicClient, formatEther, http, parseAbi, parseEventLogs, type Address, type Hex } from "viem";
import { addresses, chain } from "./judgesConfig";

/**
 * Real values read from the deployment, for the landing page. Nothing here is invented: every
 * function returns null when the chain (or the config) can't back the claim, and the page shows an
 * honest empty state instead.
 */

const client = () => createPublicClient({ chain, transport: http() });

const humanVerifiedEvent = parseAbi([
  "event HumanVerified(bytes32 indexed domain, bytes32 indexed nullifier, address indexed wallet)",
]);

export interface RecordedVerdict {
  txHash: Hex;
  domain: Hex;
  nullifier: Hex;
  wallet: Address;
}

/**
 * The verdict of one real `JudgesVerifier.verify()` transaction.
 *
 * TODO(after the first real on-chain verification): set `NEXT_PUBLIC_JUDGES_SAMPLE_TX` to that
 * transaction's hash. The RPC caps `eth_getLogs` at 100 blocks, so scanning for the latest event is
 * not practical; reading one known receipt is exact and can be checked by anyone on the explorer.
 * Until it is set (or if the receipt has no HumanVerified event) this returns null.
 */
export async function getRecordedVerdict(): Promise<RecordedVerdict | null> {
  const txHash = process.env.NEXT_PUBLIC_JUDGES_SAMPLE_TX;
  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) return null;

  try {
    const receipt = await client().getTransactionReceipt({ hash: txHash as Hex });
    if (receipt.status !== "success") return null;
    const [event] = parseEventLogs({ abi: humanVerifiedEvent, logs: receipt.logs, eventName: "HumanVerified" });
    if (!event) return null;
    return {
      txHash: receipt.transactionHash,
      domain: event.args.domain,
      nullifier: event.args.nullifier,
      wallet: event.args.wallet,
    };
  } catch {
    return null;
  }
}

export interface DocketState {
  dao: { proposals: number; yes: number; no: number } | null;
  agent: { agents: number } | null;
  faucet: { balance: string; claimAmount: string } | null;
}

const daoAbi = parseAbi([
  "function proposalCount() view returns (uint256)",
  "function proposals(uint256) view returns (string description, uint256 yesVotes, uint256 noVotes, bool exists)",
]);
const agentAbi = parseAbi(["function agentCount() view returns (uint256)"]);
const faucetAbi = parseAbi(["function claimAmount() view returns (uint256)"]);

async function safe<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

/** Live state of the three demo contracts. Each entry is null if it can't be read. */
export async function getDocketState(): Promise<DocketState> {
  const c = client();

  const dao = addresses.dao
    ? await safe(async () => {
        const count = await c.readContract({ address: addresses.dao!, abi: daoAbi, functionName: "proposalCount" });
        if (count === 0n) return { proposals: 0, yes: 0, no: 0 };
        const [, yes, no] = await c.readContract({
          address: addresses.dao!,
          abi: daoAbi,
          functionName: "proposals",
          args: [1n],
        });
        return { proposals: Number(count), yes: Number(yes), no: Number(no) };
      })
    : null;

  const agent = addresses.agentRegistry
    ? await safe(async () => ({
        agents: Number(
          await c.readContract({ address: addresses.agentRegistry!, abi: agentAbi, functionName: "agentCount" }),
        ),
      }))
    : null;

  const faucet = addresses.faucet
    ? await safe(async () => {
        const [balance, claimAmount] = await Promise.all([
          c.getBalance({ address: addresses.faucet! }),
          c.readContract({ address: addresses.faucet!, abi: faucetAbi, functionName: "claimAmount" }),
        ]);
        return { balance: formatEther(balance), claimAmount: formatEther(claimAmount) };
      })
    : null;

  return { dao, agent, faucet };
}
