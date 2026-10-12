import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Sfx } from "../audio/cues";
import { type Shot, type Span, type View, camera, mix, playhead, speedAt } from "../footage/Footage";
import { colors } from "../theme";
import { type Cue, captions, wordAt } from "../voiceover";
import { CARD, Click, Exhibit, Mark, Note, Speed, presence } from "./exhibit";
import { Stamp } from "./stage";

/**
 * The three demo apps, from the recordings in public/ (see RECORDING.md). Each runs the same
 * flow: connect, ask, sign, prove in the browser, submit, verdict. The faucet gets it at close to
 * real speed with every step narrated; the DAO and the agent registry replay it fast, because by
 * then the viewer knows the steps and only the difference matters.
 *
 * Frame numbers are scene-relative. Recording times come from stepping through each file; the
 * scene lengths put the stamps on the music's downbeats (see timeline.ts).
 */

/** The wallet's window in the captures. The first one of the faucet take opened further left. */
const WALLET: View = { x: 1426, y: 192, w: CARD.wallet };
const WALLET_FIRST: View = { x: 1391, y: 201, w: CARD.wallet };

const NOTE = { left: 1340, top: 590 } as const;
const STAMP = { left: 1090, top: 226 } as const;
const SPEED = { left: CARD.x + 24, top: CARD.y + CARD.height - 62 } as const;

// ── Faucet ───────────────────────────────────────────────────────────────────────────────────

const FAUCET = { ask: 147, prove: 379, submit: 501, accepted: 660, again: 720, rejected: 900, end: 1020 };
export const FAUCET_FRAMES = FAUCET.end;

export const FAUCET_VOICE: Cue[] = [
  { id: "faucet-1", at: 6 },
  { id: "faucet-2", at: FAUCET.ask + 5 },
  { id: "faucet-3", at: FAUCET.prove + 5 },
  { id: "faucet-4", at: FAUCET.submit + 5 },
  { id: "faucet-5", at: FAUCET.accepted + 3 },
  { id: "faucet-6", at: FAUCET.again + 12 },
  { id: "faucet-7", at: FAUCET.rejected + 3 },
];
const FAUCET_CAPTIONS = captions(FAUCET_VOICE);

export const FAUCET_SFX: Sfx[] = [
  { name: "paper", at: 0, gain: 0.5 },
  { name: "click", at: 28 },
  { name: "click", at: 164 },
  { name: "whoosh", at: 204, gain: 0.3 },
  { name: "click", at: FAUCET.prove },
  { name: "whoosh", at: 514, gain: 0.3 },
  { name: "click", at: 648 },
  { name: "stamp", at: FAUCET.accepted },
  { name: "click", at: 724 },
  { name: "whoosh", at: 750, gain: 0.3 },
  { name: "stamp", at: FAUCET.rejected },
];

const FAUCET_SPANS: Span[] = [
  { from: 0, to: FAUCET.ask, start: 0.3, end: 6.5 },
  // Plays to just before the wallet window closes, then holds on the message being signed.
  { from: FAUCET.ask, to: FAUCET.prove, start: 7.9, end: 12.8 },
  { from: FAUCET.prove, to: FAUCET.submit, start: 12.85, end: 17.3 },
  { from: FAUCET.submit, to: FAUCET.accepted, start: 17.3, end: 23.9 },
  { from: FAUCET.accepted, to: FAUCET.again, start: 24.6, end: 24.6 },
  { from: FAUCET.again, to: FAUCET.rejected, start: 27.4, end: 36.5 },
  { from: FAUCET.rejected, to: FAUCET.end, start: 36.6, end: 40.4 },
];
const FAUCET_WALLET: [number, number][] = [
  [206, 383],
  [516, 658],
  [752, 832],
];
// The page scrolls 124px right after the first verdict, so later shots sit that much higher.
const FAUCET_SHOTS: Shot[] = [
  { at: 0, view: { x: 130, y: 180, w: 1640 } },
  { at: 118, view: { x: 250, y: 250, w: 1400 }, travel: 40 },
  { at: 172, view: { x: 400, y: 560, w: 1020 }, travel: 22 },
  { at: FAUCET.accepted, view: { x: 420, y: 600, w: 930 }, travel: 1 },
  { at: FAUCET.again, view: { x: 420, y: 476, w: 930 }, travel: 1 },
  { at: 748, view: { x: 400, y: 436, w: 1020 }, travel: 18 },
  { at: FAUCET.rejected, view: { x: 410, y: 470, w: 990 }, travel: 1 },
];
const FAUCET_BESIDE_WALLET: View = { x: 430, y: 450, w: 870 };

export function Faucet() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const split = presence(frame, FAUCET_WALLET);
  const beside = frame < FAUCET.again ? FAUCET_BESIDE_WALLET : { ...FAUCET_BESIDE_WALLET, y: FAUCET_BESIDE_WALLET.y - 124 };

  return (
    <Exhibit
      title="Exhibit D — Faucet"
      clip="faucet"
      seconds={playhead(FAUCET_SPANS, frame, fps)}
      page={mix(camera(FAUCET_SHOTS, frame), beside, split)}
      wallet={frame < FAUCET.prove + 10 ? WALLET_FIRST : WALLET}
      split={split}
      captions={FAUCET_CAPTIONS}
      stamps={[FAUCET.accepted, FAUCET.rejected]}
      marks={
        <>
          <Click at={28} x={585} y={668} />
          <Click at={164} x={658} y={730} />
          <Click at={724} x={658} y={606} />
        </>
      }
    >
      <Speed rate={speedAt(FAUCET_SPANS, frame, fps)} style={SPEED} />

      <Note at={14} until={FAUCET.ask - 8} label="Exhibit D · /demo/faucet" style={NOTE}>
        Pays 0.01 MON, once per credential.
      </Note>
      <Note at={FAUCET.ask + 5 + wordAt("faucet-2", "That")} until={FAUCET.prove - 6} label="Identity secret" style={NOTE}>
        Derived from this signature. It never leaves the browser.
      </Note>
      <Note at={FAUCET.prove + 8} until={FAUCET.submit - 6} label="Zero-knowledge proof" style={NOTE}>
        Groth16, built in this tab in about four seconds.
      </Note>
      <Note at={FAUCET.submit + 5 + wordAt("faucet-4", "contract")} until={FAUCET.accepted - 6} label="Nullifier" style={NOTE}>
        Poseidon(secret, app, epoch). One per credential, per app.
      </Note>
      <Note at={FAUCET.accepted + 8} until={FAUCET.again - 6} label="Paid" style={NOTE}>
        0.01 MON, to the wallet the proof is bound to.
      </Note>
      <Note at={FAUCET.again + 12 + wordAt("faucet-6", "same", 1)} until={FAUCET.rejected - 6} label="Second attempt" style={NOTE}>
        Same secret, same app: the same nullifier comes out.
      </Note>
      <Note at={FAUCET.rejected + 3 + wordAt("faucet-7", "And")} label="Nothing sent" style={NOTE} accent>
        The page read the registry first. No transaction, no gas.
      </Note>

      {frame < FAUCET.again && (
        <Stamp text="Accepted" sub="JudgesVerifier · Monad 10143" color={colors.ink} at={FAUCET.accepted} size={104} rotate={-7} style={STAMP} />
      )}
      <Stamp text="Rejected" sub="nullifier already used" color={colors.accent} at={FAUCET.rejected} size={104} rotate={-7} style={STAMP} />
    </Exhibit>
  );
}

// ── DAO ──────────────────────────────────────────────────────────────────────────────────────

const DAO = { vote: 180, accepted: 360, again: 405, rejected: 480, end: 540 };
export const DAO_FRAMES = DAO.end;

export const DAO_VOICE: Cue[] = [
  { id: "dao-1", at: 8 },
  { id: "dao-2", at: DAO.vote + 4 },
  { id: "dao-3", at: DAO.accepted + 3 },
  // Placed so "Rejected." is spoken as the stamp lands.
  { id: "dao-4", at: DAO.rejected + 2 - wordAt("dao-4", "Rejected") },
];
const DAO_CAPTIONS = captions(DAO_VOICE);

export const DAO_SFX: Sfx[] = [
  { name: "paper", at: 0, gain: 0.5 },
  { name: "click", at: 27 },
  { name: "click", at: 193 },
  { name: "whoosh", at: 210, gain: 0.3 },
  { name: "whoosh", at: 293, gain: 0.3 },
  { name: "stamp", at: DAO.accepted },
  { name: "click", at: 407 },
  { name: "whoosh", at: 422, gain: 0.3 },
  { name: "stamp", at: DAO.rejected },
];

const DAO_SPANS: Span[] = [
  { from: 0, to: DAO.vote, start: 0.3, end: 5.5 },
  { from: DAO.vote, to: DAO.accepted, start: 6, end: 18.95 },
  { from: DAO.accepted, to: DAO.again, start: 19.8, end: 19.8 },
  { from: DAO.again, to: DAO.rejected, start: 24.3, end: 30.25 },
  { from: DAO.rejected, to: DAO.end, start: 30.4, end: 32.4 },
];
const DAO_WALLET: [number, number][] = [
  [212, 252],
  [295, DAO.accepted],
  [424, 453],
];
// This take scrolls twice: 126px before the vote is cast, 243px in all once the wallet opens.
const DAO_SHOTS: Shot[] = [
  { at: 0, view: { x: 130, y: 230, w: 1640 } },
  { at: 130, view: { x: 250, y: 300, w: 1400 }, travel: 50 },
  { at: DAO.vote, view: { x: 400, y: 560, w: 1020 }, travel: 1 },
  { at: 210, view: { x: 400, y: 500, w: 1020 }, travel: 6 },
  { at: DAO.accepted, view: { x: 420, y: 590, w: 930 }, travel: 1 },
  { at: DAO.again, view: { x: 400, y: 500, w: 1020 }, travel: 1 },
  { at: DAO.rejected, view: { x: 410, y: 573, w: 990 }, travel: 1 },
];
const DAO_BESIDE_WALLET: View = { x: 430, y: 400, w: 870 };

export function Dao() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const split = presence(frame, DAO_WALLET, 8);

  return (
    <Exhibit
      title="Exhibit E — DAO vote"
      clip="dao"
      seconds={playhead(DAO_SPANS, frame, fps)}
      page={mix(camera(DAO_SHOTS, frame), DAO_BESIDE_WALLET, split)}
      wallet={WALLET}
      split={split}
      captions={DAO_CAPTIONS}
      stamps={[DAO.accepted, DAO.rejected]}
      marks={
        <>
          <Click at={27} x={586} y={766} />
          <Click at={193} x={676} y={839} />
          <Click at={407} x={676} y={722} />
        </>
      }
    >
      <Speed rate={speedAt(DAO_SPANS, frame, fps)} style={SPEED} />

      <Note at={8 + wordAt("dao-1", "Same")} until={DAO.vote - 8} label="Exhibit E · /demo/dao" style={NOTE}>
        Same identity. A different app, so a different nullifier.
      </Note>
      <Note at={DAO.vote + 4 + wordAt("dao-2", "The")} until={DAO.accepted - 6} label="Bound to the vote" style={NOTE}>
        Wallet and choice are inside the proof. It can&apos;t be replayed as a no.
      </Note>
      <Note at={DAO.accepted + 8} until={DAO.again - 4} label="Counted" style={NOTE}>
        Proposal 1: one more yes.
      </Note>
      <Note at={DAO.rejected + 8} label="One credential, one vote" style={NOTE} accent>
        The second vote never leaves the browser.
      </Note>

      {frame < DAO.again && <Stamp text="Accepted" sub="vote counted" color={colors.ink} at={DAO.accepted} size={104} rotate={-7} style={STAMP} />}
      <Stamp text="Rejected" sub="nullifier already used" color={colors.accent} at={DAO.rejected} size={104} rotate={-7} style={STAMP} />
    </Exhibit>
  );
}

// ── Agent registry ───────────────────────────────────────────────────────────────────────────

const AGENT = { accepted: 240, end: 300 };
export const AGENT_FRAMES = AGENT.end;

// Placed so the stamp lands as the last sentence ("No identity is stored.") begins.
const AGENT_VOICE_AT = AGENT.accepted - wordAt("agent-1", "No");
export const AGENT_VOICE: Cue[] = [{ id: "agent-1", at: AGENT_VOICE_AT }];
const AGENT_CAPTIONS = captions(AGENT_VOICE);

export const AGENT_SFX: Sfx[] = [
  { name: "paper", at: 0, gain: 0.5 },
  { name: "click", at: 11 },
  { name: "click", at: 89 },
  { name: "whoosh", at: 104, gain: 0.3 },
  { name: "whoosh", at: 176, gain: 0.3 },
  { name: "stamp", at: AGENT.accepted },
];

const AGENT_SPANS: Span[] = [
  { from: 0, to: AGENT.accepted, start: 0.3, end: 17.25 },
  { from: AGENT.accepted, to: AGENT.end, start: 17.7, end: 17.7 },
];
const AGENT_WALLET: [number, number][] = [
  [106, 140],
  [178, AGENT.accepted],
];
const AGENT_SHOTS: Shot[] = [
  { at: 0, view: { x: 130, y: 180, w: 1640 } },
  { at: 70, view: { x: 250, y: 250, w: 1400 }, travel: 40 },
  { at: 102, view: { x: 400, y: 520, w: 1020 }, travel: 16 },
  { at: AGENT.accepted, view: { x: 420, y: 600, w: 930 }, travel: 1 },
];
const AGENT_BESIDE_WALLET: View = { x: 430, y: 430, w: 870 };

export function Agent() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const split = presence(frame, AGENT_WALLET, 8);

  return (
    <Exhibit
      title="Exhibit F — AI agent registry"
      clip="agent"
      seconds={playhead(AGENT_SPANS, frame, fps)}
      page={mix(camera(AGENT_SHOTS, frame), AGENT_BESIDE_WALLET, split)}
      wallet={WALLET}
      split={split}
      captions={AGENT_CAPTIONS}
      stamps={[AGENT.accepted]}
      marks={
        <>
          <Click at={11} x={581} y={626} />
          <Mark at={40} until={84} x={484} y={694} w={264} h={50} />
          <Click at={89} x={702} y={780} />
        </>
      }
    >
      <Speed rate={speedAt(AGENT_SPANS, frame, fps)} style={SPEED} />

      <Note at={AGENT_VOICE_AT + wordAt("agent-1", "An")} until={AGENT.accepted - 6} label="Exhibit F · /demo/agent" style={NOTE}>
        Agent “scout-1”, owned by the wallet the proof is bound to.
      </Note>
      <Note at={AGENT.accepted + 8} label="Registry" style={NOTE}>
        Stores no identity. Only that a verified credential stood behind it.
      </Note>

      <Stamp text="Accepted" sub="agent registered" color={colors.ink} at={AGENT.accepted} size={104} rotate={-7} style={STAMP} />
    </Exhibit>
  );
}
