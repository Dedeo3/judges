import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Sfx } from "../audio/cues";
import { type Shot, type Span, camera, playhead } from "../footage/Footage";
import { colors } from "../theme";
import { type Cue, captions, wordAt } from "../voiceover";
import { Exhibit, Mark, Note } from "./exhibit";

/**
 * Shots of the site itself, all from one walkthrough recording (public/A2-landing.mp4): the
 * landing page loading with a real verdict in it, the registration page, the SDK usage, the gas
 * table and the limits the site states about itself. The camera does the moving; where the
 * recording was mid-scroll it is held on a still frame.
 */

const still = (frames: number, second: number): Span[] => [{ from: 0, to: frames, start: second, end: second }];

// ── Live: the landing page, with its verdict panel ──────────────────────────────────────────

export const LIVE_FRAMES = 225;
const LIVE_ZOOM = 150;

export const LIVE_VOICE: Cue[] = [
  { id: "live-1", at: 6 },
  { id: "live-2", at: 138 },
];
const LIVE_CAPTIONS = captions(LIVE_VOICE);
export const LIVE_SFX: Sfx[] = [
  { name: "paper", at: 0, gain: 0.6 },
  { name: "whoosh", at: 130, gain: 0.3 },
  { name: "tick", at: LIVE_ZOOM + 12 },
];

// The page's own load sequence, at real speed, then held once it has settled.
const LIVE_SPANS: Span[] = [{ from: 0, to: LIVE_FRAMES, start: 0.85, end: 4.3 }];
const LIVE_SHOTS: Shot[] = [
  { at: 0, view: { x: 130, y: 280, w: 1640 } },
  { at: 124, view: { x: 150, y: 284, w: 1620 }, travel: 124 },
  { at: LIVE_ZOOM, view: { x: 1130, y: 548, w: 740 }, travel: 22 },
];

export function Live() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Exhibit
      title="Exhibit C — Live on Monad Testnet"
      clip="site"
      seconds={playhead(LIVE_SPANS, frame, fps)}
      page={camera(LIVE_SHOTS, frame)}
      captions={LIVE_CAPTIONS}
      marks={<Mark at={LIVE_ZOOM + 12} x={1192} y={680} w={496} h={44} />}
    >
      <Note at={LIVE_ZOOM + 14} label="Verdict panel" style={{ left: 1420, top: 420 }} width={360}>
        Read from transaction 0xa5a8…1fba, not typed in.
      </Note>
    </Exhibit>
  );
}

// ── Register: done once, off camera ─────────────────────────────────────────────────────────

export const REGISTER_FRAMES = 135;
const REGISTER_AT = 8;

export const REGISTER_VOICE: Cue[] = [{ id: "register-1", at: REGISTER_AT }];
const REGISTER_CAPTIONS = captions(REGISTER_VOICE);
const REGISTER_PASSKEY = REGISTER_AT + wordAt("register-1", "passkey");
const REGISTER_WALLET = REGISTER_AT + wordAt("register-1", "one");
export const REGISTER_SFX: Sfx[] = [
  { name: "paper", at: 0, gain: 0.5 },
  { name: "tick", at: REGISTER_PASSKEY },
  { name: "tick", at: REGISTER_WALLET },
];

const REGISTER_SHOTS: Shot[] = [
  { at: 0, view: { x: 230, y: 296, w: 1540 } },
  { at: 100, view: { x: 260, y: 310, w: 1480 }, travel: 100 },
];

export function Register() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Exhibit
      title="Registration — once per device"
      clip="site"
      seconds={playhead(still(REGISTER_FRAMES, 45.7), frame, fps)}
      page={camera(REGISTER_SHOTS, frame)}
      captions={REGISTER_CAPTIONS}
      marks={
        <>
          <Mark at={REGISTER_PASSKEY} x={484} y={715} w={274} h={50} />
          <Mark at={REGISTER_WALLET} x={484} y={923} w={580} h={50} />
        </>
      }
    >
      <Note at={REGISTER_PASSKEY + 6} label="Done before recording" style={{ left: 1300, top: 500 }} width={450}>
        Three wallets registered, one root posted on chain.
      </Note>
    </Exhibit>
  );
}

// ── Developers: two calls ───────────────────────────────────────────────────────────────────

export const DEVELOPERS_FRAMES = 120;
const DEVELOPERS_AT = 8;

export const DEVELOPERS_VOICE: Cue[] = [{ id: "dev-1", at: DEVELOPERS_AT }];
const DEVELOPERS_CAPTIONS = captions(DEVELOPERS_VOICE);
const DEV_PROVE = DEVELOPERS_AT + wordAt("dev-1", "prove");
const DEV_VERIFY = DEVELOPERS_AT + wordAt("dev-1", "verify");
export const DEVELOPERS_SFX: Sfx[] = [
  { name: "paper", at: 0, gain: 0.5 },
  { name: "tick", at: DEV_PROVE },
  { name: "tick", at: DEV_VERIFY },
];

// Framed so the page's empty right margin is on screen: that is where the note goes.
const DEVELOPERS_SHOTS: Shot[] = [
  { at: 0, view: { x: 400, y: 340, w: 1460 } },
  { at: 70, view: { x: 470, y: 420, w: 1300 }, travel: 70 },
];

export function Developers() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Exhibit
      title="Developers — the SDK"
      clip="site"
      seconds={playhead(still(DEVELOPERS_FRAMES, 27.6), frame, fps)}
      page={camera(DEVELOPERS_SHOTS, frame)}
      captions={DEVELOPERS_CAPTIONS}
      marks={
        <>
          <Mark at={DEV_PROVE} x={520} y={523} w={304} h={34} />
          <Mark at={DEV_VERIFY} x={520} y={683} w={380} h={34} />
        </>
      }
    >
      <Note at={16} label="Two calls" style={{ left: 1350, top: 400 }} width={420}>
        prove() in the browser. verify() on chain, from your own wallet client.
      </Note>
    </Exhibit>
  );
}

// ── Evidence: what the privacy costs ────────────────────────────────────────────────────────

export const EVIDENCE_FRAMES = 450;
const EVIDENCE_AT = 8;
const EVIDENCE_PAYS = 290;

export const EVIDENCE_VOICE: Cue[] = [
  { id: "evidence-1", at: EVIDENCE_AT },
  { id: "evidence-2", at: EVIDENCE_PAYS },
];
const EVIDENCE_CAPTIONS = captions(EVIDENCE_VOICE);
const CHEAPER = EVIDENCE_AT + wordAt("evidence-1", "thirteen");
const CATCH = EVIDENCE_AT + wordAt("evidence-1", "public");
const OURS = EVIDENCE_PAYS + wordAt("evidence-2", "1.1");
export const EVIDENCE_SFX: Sfx[] = [
  { name: "paper", at: 0, gain: 0.5 },
  { name: "tick", at: CHEAPER },
  { name: "marker", at: CATCH },
  { name: "tick", at: OURS },
];

const EVIDENCE_SHOTS: Shot[] = [
  { at: 0, view: { x: 420, y: 262, w: 1500 } },
  { at: 110, view: { x: 476, y: 284, w: 1400 }, travel: 90 },
];

export function Evidence() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const side = { left: 1300, top: 360 } as const;
  return (
    <Exhibit
      title="§ 2 — Evidence"
      clip="site"
      seconds={playhead(still(EVIDENCE_FRAMES, 8.6), frame, fps)}
      page={camera(EVIDENCE_SHOTS, frame)}
      captions={EVIDENCE_CAPTIONS}
      marks={
        <>
          <Mark at={CHEAPER} until={EVIDENCE_PAYS - 8} x={484} y={578} w={900} h={58} />
          <Mark at={CATCH} until={EVIDENCE_PAYS - 8} x={484} y={782} w={900} h={100} color={colors.accent} />
          <Mark at={OURS} x={484} y={420} w={900} h={58} />
        </>
      }
    >
      <Note at={CHEAPER} until={CATCH - 4} label="Passkey checked on chain" style={side} width={460}>
        About 88,000 gas. Thirteen times cheaper.
      </Note>
      <Note at={CATCH} until={EVIDENCE_PAYS - 8} label="The catch" style={side} width={460} accent>
        The public key becomes a permanent identifier, in every app.
      </Note>
      <Note at={OURS} label="What Judges pays" style={side} width={460}>
        About 1.13M gas on Monad. No passkey key on chain.
      </Note>
    </Exhibit>
  );
}

// ── Limits: what it does not prove ──────────────────────────────────────────────────────────

export const LIMITS_FRAMES = 270;
const LIMITS_AT = 8;
/** Cuts from the Holding section to the Dissent section as the narration names it. */
const DISSENT = LIMITS_AT + wordAt("limits-1", "Judges") - 6;

export const LIMITS_VOICE: Cue[] = [{ id: "limits-1", at: LIMITS_AT }];
const LIMITS_CAPTIONS = captions(LIMITS_VOICE);
const NOT_PROVEN = LIMITS_AT + wordAt("limits-1", "one");
const TWICE = LIMITS_AT + wordAt("limits-1", "Someone");
export const LIMITS_SFX: Sfx[] = [
  { name: "paper", at: 0, gain: 0.5 },
  { name: "marker", at: NOT_PROVEN },
  { name: "marker", at: TWICE },
  { name: "paper", at: DISSENT, gain: 0.5 },
  { name: "marker", at: DISSENT + 16 },
];

const LIMITS_SPANS: Span[] = [
  { from: 0, to: DISSENT, start: 6.9, end: 6.9 },
  { from: DISSENT, to: LIMITS_FRAMES, start: 18.95, end: 18.95 },
];
const LIMITS_SHOTS: Shot[] = [
  { at: 0, view: { x: 420, y: 400, w: 1420 } },
  { at: 70, view: { x: 470, y: 433, w: 1300 }, travel: 60 },
  { at: DISSENT, view: { x: 420, y: 370, w: 1420 }, travel: 1 },
  { at: DISSENT + 40, view: { x: 470, y: 420, w: 1300 }, travel: 38 },
];

export function Limits() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const side = { left: 1350, top: 400 } as const;
  const dissent = frame >= DISSENT;
  return (
    <Exhibit
      title={dissent ? "§ 5 — Dissent" : "§ 1 — Holding"}
      clip="site"
      seconds={playhead(LIMITS_SPANS, frame, fps)}
      page={camera(LIMITS_SHOTS, frame)}
      captions={LIMITS_CAPTIONS}
      marks={
        dissent ? (
          <>
            <Mark at={DISSENT + 16} x={1152} y={585} w={208} h={36} color={colors.accent} />
            <Mark at={DISSENT + 22} x={524} y={617} w={464} h={36} color={colors.accent} />
          </>
        ) : (
          <>
            <Mark at={NOT_PROVEN} x={484} y={703} w={604} h={40} color={colors.accent} />
            <Mark at={TWICE} x={1056} y={779} w={298} h={38} color={colors.accent} />
            <Mark at={TWICE + 5} x={484} y={817} w={272} h={38} color={colors.accent} />
          </>
        )
      }
    >
      <Note at={NOT_PROVEN} until={DISSENT - 6} label="Not proven" style={side} width={440} accent>
        One person, one credential.
      </Note>
      <Note at={DISSENT + 16} label="The site says so itself" style={side} width={440}>
        Five limits, stated in full.
      </Note>
    </Exhibit>
  );
}
