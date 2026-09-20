"use client";

import { useState } from "react";
import { DemoShell } from "@/components/DemoShell";
import { daoAbi } from "@/lib/abis";
import { APP_IDS, addresses } from "@/lib/judgesConfig";
import { publicClient } from "@/lib/wallet";

export default function DaoDemoPage() {
  const [proposalId, setProposalId] = useState("1");
  const [support, setSupport] = useState(true);

  return (
    <DemoShell
      title="Sybil-resistant DAO"
      demo="dao"
      appId={APP_IDS.dao}
      intro={
        <>
          <p>
            One verified credential, one vote per proposal. The contract keeps no per-voter records at all — the
            second vote from the same passkey simply reverts with <code>NullifierAlreadyUsed</code>.
          </p>
          <p>
            The proof is bound to both your wallet <em>and</em> your vote direction, so nobody can lift it from the
            mempool and flip it.
          </p>
        </>
      }
      action={{
        label: `Verify with Judges and vote ${support ? "yes" : "no"}`,
        contextHash: async () =>
          publicClient().readContract({
            address: addresses.dao!,
            abi: daoAbi,
            functionName: "contextHashFor",
            args: [BigInt(proposalId), support],
          }),
        submit: async ({ proof, account, walletClient }) =>
          walletClient.writeContract({
            address: addresses.dao!,
            abi: daoAbi,
            functionName: "vote",
            args: [BigInt(proposalId), support, proof.proof, proof.merkleRoot, proof.nullifier, proof.wallet],
            account,
            chain: walletClient.chain,
          }),
      }}
    >
      <label className="field">
        Proposal id
        <input value={proposalId} onChange={(e) => setProposalId(e.target.value)} style={{ width: "6rem" }} />
      </label>
      <label className="check">
        <input type="checkbox" checked={support} onChange={(e) => setSupport(e.target.checked)} /> Vote yes
      </label>
    </DemoShell>
  );
}
