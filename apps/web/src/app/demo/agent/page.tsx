"use client";

import { useState } from "react";
import { DemoShell } from "@/components/DemoShell";
import { agentRegistryAbi } from "@/lib/abis";
import { APP_IDS, addresses } from "@/lib/judgesConfig";
import { publicClient } from "@/lib/wallet";

export default function AgentDemoPage() {
  const [name, setName] = useState("scout-1");

  return (
    <DemoShell
      title="AI agent registry"
      demo="agentRegistry"
      appId={APP_IDS.agentRegistry}
      intro={
        <>
          <p>
            An agent is only recorded if a real user-controlled credential authorized the registration. The registry
            stores no identity — just the fact that a verified credential stood behind this agent.
          </p>
          <p>
            The agent is owned by the wallet the proof is bound to, not whoever sent the transaction, and the name is
            part of the binding.
          </p>
        </>
      }
      action={{
        label: "Verify with Judges and register agent",
        contextHash: async () =>
          publicClient().readContract({
            address: addresses.agentRegistry!,
            abi: agentRegistryAbi,
            functionName: "contextHashFor",
            args: [name],
          }),
        submit: async ({ proof, account, walletClient }) =>
          walletClient.writeContract({
            address: addresses.agentRegistry!,
            abi: agentRegistryAbi,
            functionName: "registerAgent",
            args: [name, proof.proof, proof.walletCommitment, proof.nullifier, proof.wallet],
            account,
            chain: walletClient.chain,
          }),
      }}
    >
      <label className="field">
        Agent name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
    </DemoShell>
  );
}
