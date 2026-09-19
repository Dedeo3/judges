import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Footnote, Marginalia, Section } from "@/components/Document";
import { Hash } from "@/components/Hash";
import { SiteFrame } from "@/components/SiteFrame";
import { Verdict } from "@/components/Verdict";
import { getDocketState, getRecordedVerdict } from "@/lib/chainState";
import { shorten } from "@/lib/format";
import { addresses, chain, explorerTxUrl } from "@/lib/judgesConfig";
import { OPINION_SECTIONS as S } from "@/lib/sections";

// Chain reads are refreshed at most once a minute; the page itself is otherwise static.
export const revalidate = 60;

const HERO_SNIPPET = `const proof = await judges.prove({ assurance: "user_verified", wallet });
const result = await judges.verify(proof, { walletClient, verifierAddress, chain });`;

const HOLDING = [
  { level: "possession", meaning: "The user controls the credential and can produce a valid signature." },
  { level: "user_verified", meaning: "The WebAuthn ceremony required local user verification." },
  {
    level: "unique",
    meaning: "The application has a domain-specific uniqueness policy. This is not derived from WebAuthn alone.",
  },
];

// Measured figures, quoted from Judges_README.md §8.1 (contracts/experiments/WebAuthnOnchainSpike.sol).
const GAS = [
  { path: "JudgesVerifier.verify(): ZK proof, signature checked off-chain", gas: 1_130_000, note: null },
  { path: "The same, plus on-chain WebAuthn and P256VERIFY", gas: 1_166_000, note: "+3.5%" },
  { path: "No ZK: passkey verified on-chain only", gas: 88_000, note: null },
];
const GAS_MAX = Math.max(...GAS.map((row) => row.gas));

// Judges_README.md §27, limitations 6 to 10, in full. Section numbers refer to that document.
const DISSENT: { title: string; body: string }[] = [
  {
    title: "The trusted setup is single-contributor and local.",
    body: "Fine for a demo; not production-safe. Whoever ran that one contribution could in principle forge proofs. A real deployment needs a multi-party ceremony, or a public Powers-of-Tau file plus an independent phase-2 contribution. (Both documented public .ptau mirrors returned AccessDenied at build time, so the MVP generates its own.) See prover/README.md.",
  },
  {
    title: "A nullifier can be griefed, though not stolen.",
    body: "Proofs are bound to a wallet and an action (§7.2), so a proof lifted from the mempool cannot be redirected. But an observer can still submit it for its rightful wallet, which merely makes the owner's own action land a moment early while consuming the nullifier. Closing that needs a per-submission nonce inside the circuit; out of MVP scope.",
  },
  {
    title: "The credential secret is server-derived, not authenticator-derived.",
    body: "A WebAuthn private key is non-extractable by design, so the value playing the role of credential_secret in §7.4 is HMAC(JUDGES_DOMAIN_SECRET, credentialId ‖ publicKey). This means the Judges backend can compute any registered credential's nullifiers. It cannot forge a WebAuthn assertion, so it cannot impersonate a user to a relying party, but a fully trust-minimised design would not hand the backend that capability. Named here rather than buried.",
  },
  {
    title: "unique assurance is still a policy label, not an enforced property,",
    body: "exactly as §3 warns. No policy engine exists yet (§26); the assurance level currently feeds the action binding.",
  },
  {
    title: "Groth16 verification costs about 1.13M gas on Monad,",
    body: "because ecPairing and ecMul are repriced at 5× Ethereum. Benchmarks taken on a local Foundry EVM read Ethereum prices and understate this by roughly 845,000 gas. See §8.1.",
  },
];

const steps = [
  { title: "Passkey", sub: "The private key stays on the device" },
  { title: "User verification", sub: "Biometric or PIN, checked by the device" },
  { title: "Proof", sub: "Groth16: commitment and nullifier" },
  { title: "JudgesVerifier on Monad", sub: "Checks the proof, consumes the nullifier" },
  { title: "Application", sub: "DAO vote, agent registry, faucet" },
];

function Procedure() {
  const boxH = 64;
  const gap = 24;
  const height = steps.length * boxH + (steps.length - 1) * gap + 2;
  return (
    <svg
      className="procedure"
      viewBox={`0 0 360 ${height}`}
      role="img"
      aria-labelledby="procedure-title"
    >
      <title id="procedure-title">
        Five steps from passkey to application: passkey, user verification, proof, JudgesVerifier on Monad,
        application.
      </title>
      {steps.map((step, i) => {
        const y = 1 + i * (boxH + gap);
        return (
          <g key={step.title}>
            <rect className="line" x="1" y={y} width="358" height={boxH} />
            <text x="16" y={y + 26} fontSize="14" fontWeight="500">
              {i + 1}. {step.title}
            </text>
            <text className="sub" x="16" y={y + 48} fontSize="12">
              {step.sub}
            </text>
            {i < steps.length - 1 && (
              <>
                <path className="line" d={`M180 ${y + boxH} V${y + boxH + gap}`} />
                <path className="line" d={`M174 ${y + boxH + gap - 7} L180 ${y + boxH + gap} L186 ${y + boxH + gap - 7}`} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default async function Home() {
  const [verdict, docket] = await Promise.all([getRecordedVerdict(), getDocketState()]);
  const txUrl = verdict ? explorerTxUrl(verdict.txHash) : null;

  return (
    <SiteFrame>
      <section id="opinion" className="sec" aria-labelledby="opinion-title">
        <div className="sec-side">
          <span className="sec-num">Opinion</span>
          <Marginalia>
            Filed on {chain.name}, chain {chain.id}. Every value in the Verdict panel is read from a transaction
            on that chain.
          </Marginalia>
        </div>
        <div className="sec-body sec-body--wide">
          <h1 id="opinion-title">Judges</h1>
          <p className="claim">
            A wallet, backed by a passkey that passed user verification. Nothing else disclosed.
          </p>

          <div className="hero-cols">
            <CodeBlock code={HERO_SNIPPET} label="typescript" wrap />

            <div className="panel" aria-label="Verdict">
              <div className="panel-head label">Verdict</div>
              {verdict ? (
                <dl className="mono" style={{ fontSize: "0.875rem" }}>
                  <div>
                    <dt>valid</dt>
                    <dd>✓ true</dd>
                  </div>
                  <div>
                    <dt>txHash</dt>
                    <dd>
                      {txUrl ? (
                        <a href={txUrl} target="_blank" rel="noreferrer">
                          {shorten(verdict.txHash)}
                        </a>
                      ) : (
                        <Hash value={verdict.txHash} />
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>domain</dt>
                    <dd>
                      <Hash value={verdict.domain} />
                    </dd>
                  </div>
                  <div>
                    <dt>nullifier</dt>
                    <dd>
                      <Hash value={verdict.nullifier} />
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="panel-empty">
                  <p>No verification has been recorded on this deployment yet.</p>
                  <p style={{ marginTop: "0.5rem" }}>
                    <Link href="/demo/faucet">Run the faucet demo</Link> to record one.
                  </p>
                  {addresses.judgesVerifier && (
                    <p className="mono muted" style={{ marginTop: "0.75rem", fontSize: "0.8125rem" }}>
                      JudgesVerifier deployed at <Hash value={addresses.judgesVerifier} head={8} tail={6} />
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <ol className="ledger" aria-label="Two attempts with the same credential">
              <li>
                <span className="label muted">Attempt 1</span>
                <Verdict status="accepted" />
              </li>
              <li>
                <span className="label muted">Attempt 2, same credential</span>
                <Verdict status="rejected" reason="nullifier already used" />
              </li>
            </ol>
            <p className="margin" style={{ maxWidth: "none", marginTop: "0.5rem" }}>
              Enforced by NullifierRegistry and covered by contracts/test/NullifierRegistry.t.sol.
            </p>
          </div>
        </div>
      </section>

      <Section
        list={S}
        id="holding"
        margin={
          <>
            unique: a policy label. Not derived from WebAuthn alone.
          </>
        }
      >
        <p>
          A Judges proof tells an application how much it may conclude about whoever controls a wallet. There are
          three levels, and the third is a label the application chooses, not a guarantee.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Level</th>
                <th scope="col">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {HOLDING.map((row) => (
                <tr key={row.level}>
                  <th scope="row">{row.level}</th>
                  <td>{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          What a passkey does not prove is <code>1 credential = 1 human</code>. Passkeys may be device-bound or
          synced across devices, and one person can create more than one. A nullifier stops the same credential
          being used twice within an application; it does not stop a person from holding several credentials.
        </p>
      </Section>

      <Section
        list={S}
        id="evidence"
        margin="Measured on Monad. Source: Judges_README.md §8.1, contracts/experiments/WebAuthnOnchainSpike.sol."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Path</th>
                <th scope="col">Gas</th>
              </tr>
            </thead>
            <tbody>
              {GAS.map((row) => (
                <tr key={row.path}>
                  <td>{row.path}</td>
                  <td className="num" style={{ minWidth: "10rem" }}>
                    ~{row.gas.toLocaleString("en-US")}
                    {row.note && <span className="muted"> ({row.note})</span>}
                    <span className="bar" aria-hidden="true" style={{ width: `${(row.gas / GAS_MAX) * 100}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Monad reprices ecPairing and ecMul at 5× Ethereum, so Groth16 verification dominates the cost; adding the
          P256VERIFY precompile on top costs under 4% more.
        </p>
        <p>
          The real cost is privacy. P256VERIFY needs the passkey&apos;s public key as raw coordinates in calldata,
          which turns it into a permanent identifier that links every action by that credential across every
          domain.
        </p>
      </Section>

      <Section
        list={S}
        id="procedure"
        margin="P-256 is checked off-chain during the ceremony. MonadP256Adapter is deployed separately."
      >
        <Procedure />
      </Section>

      <Section list={S} id="docket">
        <ol className="docket">
          <li>
            <span className="label muted">Docket 1</span>
            <h3>DAO vote</h3>
            <p>One credential, one vote per proposal. A second vote reverts with NullifierAlreadyUsed.</p>
            {docket.dao && (
              <p className="mono muted state" style={{ fontSize: "0.8125rem" }}>
                {docket.dao.proposals === 0
                  ? "No proposals on chain yet."
                  : `Proposals on chain: ${docket.dao.proposals}. Proposal 1: yes ${docket.dao.yes}, no ${docket.dao.no}.`}
              </p>
            )}
            <p className="state">
              <Link href="/demo/dao">Open the DAO demo</Link>
            </p>
          </li>
          <li>
            <span className="label muted">Docket 2</span>
            <h3>Agent registry</h3>
            <p>An agent is recorded only if a verified credential authorized its registration.</p>
            {docket.agent && (
              <p className="mono muted state" style={{ fontSize: "0.8125rem" }}>
                Agents registered: {docket.agent.agents}.
              </p>
            )}
            <p className="state">
              <Link href="/demo/agent">Open the agent registry demo</Link>
            </p>
          </li>
          <li>
            <span className="label muted">Docket 3</span>
            <h3>Faucet</h3>
            <p>One claim per credential. Funds go to the wallet the proof is bound to.</p>
            {docket.faucet && (
              <p className="mono muted state" style={{ fontSize: "0.8125rem" }}>
                Faucet balance: {docket.faucet.balance} MON. Claim amount: {docket.faucet.claimAmount} MON.
              </p>
            )}
            <p className="state">
              <Link href="/demo/faucet">Open the faucet demo</Link>
            </p>
          </li>
        </ol>
      </Section>

      <Section
        list={S}
        id="dissent"
        margin="Judges_README.md §27, limitations 6 to 10. The section numbers in the notes refer to that document."
      >
        <p>
          Five limitations we know about and ship anyway. They are stated here in full, with the same weight as
          everything above.
        </p>
        <ol className="footnotes">
          {DISSENT.map((item, i) => (
            <Footnote key={item.title} n={i + 1}>
              <strong style={{ fontWeight: 600 }}>{item.title}</strong> {item.body}
            </Footnote>
          ))}
        </ol>
      </Section>
    </SiteFrame>
  );
}
