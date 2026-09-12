"use client";

import { DemoShell } from "@/components/DemoShell";
import { faucetAbi } from "@/lib/abis";
import { APP_IDS, addresses } from "@/lib/judgesConfig";
import { publicClient } from "@/lib/wallet";

export default function FaucetDemoPage() {
  return (
    <DemoShell
      title="Sybil-resistant faucet"
      demo="faucet"
      appId={APP_IDS.faucet}
      intro={
        <>
          <p>
            One claim per verified credential. Claim once and it works; claim again with the same passkey and it
            reverts with <code>NullifierAlreadyUsed</code> — no wallet-address heuristics, no per-claim bookkeeping.
          </p>
          <p>
            Funds go to the wallet the proof is bound to, so someone submitting your proof just pays gas to deliver
            you your own claim.
          </p>
        </>
      }
      action={{
        label: "Verify with Judges and claim",
        contextHash: async () =>
          publicClient().readContract({
            address: addresses.faucet!,
            abi: faucetAbi,
            functionName: "contextHashFor",
          }),
        submit: async ({ proof, account, walletClient }) =>
          walletClient.writeContract({
            address: addresses.faucet!,
            abi: faucetAbi,
            functionName: "claim",
            args: [proof.proof, proof.walletCommitment, proof.nullifier, proof.wallet],
            account,
            chain: walletClient.chain,
          }),
      }}
    />
  );
}
