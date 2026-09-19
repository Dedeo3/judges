import Link from "next/link";
import type { ReactNode } from "react";
import { addresses, chain, NETWORK } from "@/lib/judgesConfig";

const networkLabel = NETWORK === "monad-mainnet" ? "Monad Mainnet" : "Monad Testnet";

function addressUrl(address: string): string | null {
  const base = chain.blockExplorers?.default?.url;
  return base ? `${base}/address/${address}` : null;
}

const NOTES: { name: string; address: string | null }[] = [
  { name: "JudgesVerifier", address: addresses.judgesVerifier },
  { name: "SybilResistantDAO", address: addresses.dao },
  { name: "AgentRegistry", address: addresses.agentRegistry },
  { name: "SybilResistantFaucet", address: addresses.faucet },
];

/** Caption line, navigation, page body, and a footer set as footnotes. */
export function SiteFrame({ children }: { children: ReactNode }) {
  const repo = process.env.NEXT_PUBLIC_REPO_URL;
  const deployed = NOTES.filter((note) => note.address);

  const footnotes: ReactNode[] = [];
  if (repo) {
    footnotes.push(
      <>
        Source code: <a href={repo}>{repo}</a>
      </>,
    );
  }
  for (const note of deployed) {
    const href = addressUrl(note.address!);
    footnotes.push(
      <>
        {note.name}, {networkLabel}, chain {chain.id}:{" "}
        {href ? (
          <a className="mono" href={href} target="_blank" rel="noreferrer">
            {note.address}
          </a>
        ) : (
          <span className="mono">{note.address}</span>
        )}
      </>,
    );
  }
  if (deployed.length === 0) {
    footnotes.push(<>No contract addresses are configured for this build.</>);
  }
  const explorer = chain.blockExplorers?.default;
  if (explorer) {
    footnotes.push(
      <>
        Block explorer:{" "}
        <a href={explorer.url} target="_blank" rel="noreferrer">
          {explorer.name}
        </a>
      </>,
    );
  }

  return (
    <>
      <header className="page site-header">
        <p className="caption label">
          Judges Protocol · Slip opinion · {networkLabel} · Chain {chain.id}
        </p>
        <nav className="nav" aria-label="Primary">
          <Link href="/">Opinion</Link>
          <Link href="/#evidence">Evidence</Link>
          <Link href="/#dissent">Dissent</Link>
          <Link href="/developers">Developers</Link>
          <Link href="/demo">Demos</Link>
        </nav>
      </header>

      <main className="page">{children}</main>

      <footer className="page site-footer">
        <ol>
          {footnotes.map((note, i) => (
            <li key={i}>
              <span className="fn-n">{i + 1}</span>
              <span>{note}</span>
            </li>
          ))}
        </ol>
      </footer>
    </>
  );
}
