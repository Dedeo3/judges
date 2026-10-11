import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { Section } from "@/components/Document";
import { SiteFrame } from "@/components/SiteFrame";
import { addresses, chain } from "@/lib/judgesConfig";
import { DEVELOPER_SECTIONS as S } from "@/lib/sections";

export const metadata: Metadata = {
  title: "Developers · Judges",
  description: "Install @judges/sdk and verify that a wallet is backed by a user-verified passkey.",
};

// Code below is copied from docs/integration.md, which is the source of truth.
const INSTALL = `npm install @judges/sdk`;

const USAGE = `import { Judges } from "@judges/sdk";

const judges = new Judges({
  network: "monad-testnet",
  appId: "airdrop",                        // your app's id within your own namespace
  judgesOrigin: "https://judges.example",  // where Judges is deployed
});

button.addEventListener("click", async () => {
  // Opens the popup — call it directly from the click handler, before any \`await\`,
  // or the browser blocks it.
  const proof = await judges.prove({
    assurance: "user_verified",
    wallet: account, // the proof is bound to this wallet
  });

  // Submits to JudgesVerifier.verify() using YOUR wallet client — the SDK never holds a signer.
  const result = await judges.verify(proof, {
    walletClient,
    verifierAddress: "0x...", // see the Contracts section below
    chain: monadTestnet,
  });

  if (result.valid) {
    // allow the action — this wallet is backed by a user-verified passkey, and that passkey
    // can't be used for this action again in your app (nullifier consumed on-chain).
  }
});`;

const NAMESPACE_TS = `import { namespacedAppId } from "@judges/sdk";
namespacedAppId(window.location.origin, "airdrop"); // "https://your.site/airdrop"`;

const NAMESPACE_SOL = `bytes32 domain = bytes32(JudgesField.hashToField("https://your.site/airdrop"));`;

const BINDING = `const contextHash = await publicClient.readContract({
  address: daoAddress,
  abi: daoAbi,
  functionName: "contextHashFor",
  args: [proposalId, support],
});

const proof = await judges.prove({ assurance: "user_verified", wallet: account, contextHash });

await daoContract.write.vote([proposalId, support, proof.proof, proof.merkleRoot, proof.nullifier, proof.wallet]);`;

const NULLIFIER_CHECK = `const used = await judges.isNullifierUsed({
  domain: proof.domain,
  nullifier: proof.nullifier,
  verifierAddress: "0x...",
  chain: monadTestnet,
});`;

const ERRORS = [
  { code: "popup_blocked", meaning: "not called from a user gesture" },
  { code: "cancelled", meaning: "the user pressed Cancel in the popup" },
  { code: "closed", meaning: "the user closed the popup" },
  { code: "timeout", meaning: "no answer within popupTimeoutMs (default 5 minutes)" },
  { code: "failed", meaning: "the request itself was invalid" },
];

const CONTRACTS: { name: string; address: string | null }[] = [
  { name: "JudgesVerifier", address: addresses.judgesVerifier },
  { name: "SybilResistantDAO", address: addresses.dao },
  { name: "AgentRegistry", address: addresses.agentRegistry },
  { name: "SybilResistantFaucet", address: addresses.faucet },
];

export default function DevelopersPage() {
  const explorer = chain.blockExplorers?.default?.url;

  return (
    <SiteFrame>
      <header className="sec" style={{ borderTop: 0 }}>
        <div className="sec-side">
          <span className="sec-num">Developers</span>
        </div>
        <div className="sec-body">
          <h1>Developers</h1>
          <p className="claim">
            Verify that a wallet is backed by a user-verified passkey. No identity disclosure, no KYC, no
            registration with Judges.
          </p>
          <p className="muted">
            A runnable version of everything here is in examples/external-dapp. The full guide is
            docs/integration.md.
          </p>
        </div>
      </header>

      <Section list={S} id="install" margin="Until the package is on npm, install a packed tarball. See examples/external-dapp/README.md.">
        <CodeBlock code={INSTALL} label="shell" />
      </Section>

      <Section
        list={S}
        id="usage"
        margin="Passkeys are bound to the site that created them, so your site never runs the ceremony. The SDK opens a popup on the Judges origin and gets only the proof back."
      >
        <CodeBlock code={USAGE} label="typescript" />
      </Section>

      <Section list={S} id="namespace">
        <p>
          Every proof requested from your site is scoped to your origin. With <code>appId: &quot;airdrop&quot;</code>{" "}
          on <code>https://your.site</code>, the effective app id is <code>https://your.site/airdrop</code>.
        </p>
        <CodeBlock code={NAMESPACE_TS} label="typescript" />
        <p>Deploy your consuming contract with the domain derived from that full string:</p>
        <CodeBlock code={NAMESPACE_SOL} label="solidity" />
        <p>
          Without this, any site could open the Judges popup, get a user to tap their passkey, and spend that
          user&apos;s one-per-app action inside your airdrop or DAO. Namespacing by origin means a site can only act
          within its own space, and it needs no allowlist, so nobody has to ask permission to integrate.
        </p>
        <p>
          Pick one canonical origin. <code>https://www.your.site</code> and <code>https://your.site</code> are
          different namespaces, so a user could act once on each.
        </p>
      </Section>

      <Section list={S} id="binding">
        <p>
          By default a proof is bound to the wallet but not to a particular action. That is enough for a plain
          &ldquo;is this a verified user&rdquo; gate. When the action matters, such as which way someone voted or
          which agent they registered, bind it, or a third party could lift the proof from the mempool and point it
          at a different action.
        </p>
        <p>
          Your contract defines the binding and exposes it as a view, so there is one definition and nothing to
          reimplement in TypeScript:
        </p>
        <CodeBlock code={BINDING} label="typescript" />
        <p>To check a nullifier without a wallet:</p>
        <CodeBlock code={NULLIFIER_CHECK} label="typescript" />
        <p>
          contracts/src/demos has three worked examples: DAO voting, an AI agent registry, and a faucet.
        </p>
      </Section>

      <Section list={S} id="requirements">
        <ul className="prose-list">
          <li>
            Call <code>prove()</code> from a user gesture. Otherwise it rejects with <code>JudgesPopupError</code>{" "}
            code <code>popup_blocked</code>.
          </li>
          <li>
            Do not send <code>Cross-Origin-Opener-Policy: same-origin</code>. It severs your page&apos;s link to the
            popup and the proof cannot come back. <code>same-origin-allow-popups</code> works.
          </li>
          <li>No CORS setup is needed. Your site never calls the Judges API directly.</li>
        </ul>
      </Section>

      <Section
        list={S}
        id="errors"
        margin="A proof for a different app, wallet, or action than requested is rejected with a plain Error naming the field. Treat that as an integration bug."
      >
        <p>
          <code>prove()</code> rejects with <code>JudgesPopupError</code>.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">code</th>
                <th scope="col">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {ERRORS.map((row) => (
                <tr key={row.code}>
                  <th scope="row">{row.code}</th>
                  <td>{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        list={S}
        id="contracts"
        margin={`${chain.name}, chain ${chain.id}. Addresses come from this build's configuration.`}
      >
        {CONTRACTS.some((c) => c.address) ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Contract</th>
                  <th scope="col">Address</th>
                </tr>
              </thead>
              <tbody>
                {CONTRACTS.map((row) => (
                  <tr key={row.name}>
                    <th scope="row">{row.name}</th>
                    <td className="mono" style={{ fontSize: "0.8125rem", overflowWrap: "anywhere" }}>
                      {row.address ? (
                        explorer ? (
                          <a href={`${explorer}/address/${row.address}`} target="_blank" rel="noreferrer">
                            {row.address}
                          </a>
                        ) : (
                          row.address
                        )
                      ) : (
                        <span className="muted">not configured</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No contract addresses are configured for this build.</p>
        )}
      </Section>
    </SiteFrame>
  );
}
