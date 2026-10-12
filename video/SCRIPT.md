# Judges — video script & motion design brief

Working doc for both submission videos. Read this before changing a scene; update it when a
scene changes.

Status: `JudgesDemo` is complete at 2:23.5 — animated opening, real recordings of the three
demo apps, narration, music and effects. `JudgesPitch` is still a scaffold (§5).

## 1. Ground rules

Two rounds of feedback shaped the pictures. Round one: the scaffold was "full of text" and
boring. Round two: small centred icons on a flat background were "still too monoton". A third
asked for a voice that explains the app like a person would, and music so the viewer does not
drift.

- **A different kind of picture every 4–5 seconds.** Never two beats in a row with the same
  composition.
- **The subject fills the frame.** Aim for 50–70% of the frame.
- **Motion carries the meaning; text labels it.** One statement per beat, with at most one
  word in the accent colour.
- **Physical motion, not fades.** Things drop, slam, wipe, draw themselves and settle with
  overshoot (`spring()`).
- **Depth, not flat fills.** Lit background, vignette, film grain, shadows under anything that
  sits on the page.
- **Captions are the narration, word for word,** lighting up as each word is spoken. Someone
  watching muted loses nothing.
- **Real footage beats animation** wherever the real `/demo` flow can show it. Animation is for
  what has no UI: the problem, the Merkle tree, the verifier.
- **Get to the working product early, and make it most of the video.** The recordings start
  at 0:28 and run to 2:10, which is 71% of the video; the three demo apps alone are 62 seconds.
- **Show it failing on purpose.** The rejected second attempt is the product, so it is on
  screen three times: animated, on the faucet, on the DAO.
- **Say when a wait was shortened.** A chip shows the speed whenever a recording runs faster
  than it happened.

## 2. Visual language: the case file

The site is styled as a court slip opinion ("Judges Protocol · Slip Opinion · Monad Testnet ·
Chain 10143", § marks, margin notes, a ledger of attempts, the claim "Nothing else disclosed").
The video takes that literally and turns it into objects:

| Motif | Where it comes from | What it says |
|---|---|---|
| Sheet dropped on a lit desk | the site's cover section, as a physical page | this is a filing, not a pitch deck |
| Header strip on every scene | the site's top bar, verbatim | continuity with the product |
| Marker redaction bars | "Nothing else disclosed" | privacy, shown instead of stated |
| Rubber stamps (FILED, ACCEPTED, REJECTED) | the Verdict component | the on-chain result |
| Seal with ring text and a § | the site's section mark | authority; a quiet moving detail |
| Exhibit A … F, § 1, § 2, § 5 | the site's section numbering | each beat is a piece of evidence |
| Slips pinned over a recording | the site's margin notes | the one fact to take from this step |

**Kept out, as on the site** (`DESIGN-FE.md` §6): fingerprints, faces and eyes, because they
suggest biometrics are being collected, and gavels, scales and courthouse pillars. So user
verification is drawn as a PIN being entered, the verdict as a rubber stamp pressing down, and
the seal carries a §. The one face-shaped thing in the video is the silhouette on the KYC form
in beat 2b, which is the practice being argued against and ends up redacted.

Palette and type are the site's: paper `#F1EDE4`, ink `#15130F`, Newsreader and IBM Plex Mono.
Red still means one thing only — something that is or should be rejected (sybil wallets, leaked
data, the second attempt, a stated limit). On the ink scenes red is lifted to `#E2483C`.

Icons are Phosphor (`@phosphor-icons/react`, MIT). Shared pieces live in `src/scenes/stage.tsx`
(`Stage`, `HeaderStrip`, `Caption`, `Stamp`, `RedactBar`, `Rise`, `pop`) and
`src/scenes/exhibit.tsx` (`Exhibit`, `Note`, `Mark`, `Click`, `Speed`).

### How the recordings are framed

The recordings are display captures: browser chrome and a bookmarks bar on top, the page below,
the wallet's windows over the right edge. They are never shown whole.

- The **page** is cropped out and laid on the desk as a sheet, the same sheet as the title.
  Because the site is paper-coloured, the crop reads as a printed page rather than a browser.
- When the wallet asks for something, its window is cropped out as a **second sheet** that
  slides in beside the page, and slides away when it closes.
- A **camera** moves over the page: wide to establish, in on the button being pressed, in on
  the result. Clicks leave a ring.
- **Waits are shortened**, never cut out, and the speed is shown.
- The wallet shows the account's nickname ("Seed Phrase 2 #1"). It is only a label, but on
  screen it reads like a secret, so it is covered. The address is left visible.

## 3. JudgesDemo (2:23.5, cap 3:00)

Audience: hackathon judges who have never seen the product. It has to answer "what is this and
does it work".

| # | Scene | Starts | Length | What happens |
|---|-------|--------|--------|--------------|
| 1 | Title | 0:00 | 3s | Cover sheet drops onto a desk; wordmark rises; redaction bars; seal; FILED stamp |
| 2a | Problem — sybil (ink) | 0:03 | 5s | One person fans out into five wallets, a vote counter runs to 5,000, the frame floods |
| 2b | Problem — privacy (paper) | 0:08 | 5s | A KYC form is scanned, its fields leak to the verifier, then everything is redacted and stamped |
| 3 | Mechanism | 0:13 | 15s | Camera travels four stations: passkey → proof → chain → verdict, then all four side by side |
| 4 | Exhibit C — live | 0:28 | 7.5s | The landing page loads with a real verdict in its panel; zoom on the transaction hash |
| 5 | Registration | 0:35.5 | 4.5s | The registration page, with the two steps marked. Done off camera, and the slide says so |
| 6 | Exhibit D — faucet | 0:40 | 34s | Connect, ask, sign, prove, submit, **ACCEPTED** at 1:02; same credential again, **REJECTED** at 1:10 |
| 7 | Exhibit E — DAO | 1:14 | 18s | The same flow at about 2×; ACCEPTED at 1:26, second vote REJECTED at 1:30 |
| 8 | Exhibit F — agent registry | 1:32 | 10s | The same flow at about 2×; ACCEPTED at 1:40 |
| 9 | Developers | 1:42 | 4s | The SDK usage, `prove` and `verify` marked |
| 10 | § 2 Evidence | 1:46 | 15s | The gas table: the cheap path, why it was not taken, what the proof costs |
| 11 | § 1 Holding, § 5 Dissent | 2:01 | 9s | The site's own statement of what a passkey does not prove |
| 12 | Holding | 2:10 | 7s | What it does prove, three redaction bars, "Nothing else disclosed" stamp |
| 13 | Outro | 2:17 | 6.5s | Title sheet again, with the site and repository typed onto it; FILED |

Running order and lengths are code: `src/timeline.ts`.

### Narration

The text is `src/voiceover/script.json`; that file is the source, this is a reading copy.

> A wallet costs nothing to make. One person can cast five thousand votes. The usual fix? Hand
> over your identity. Judges takes a proof instead.
>
> Your passkey stays on your device. A zero-knowledge proof says you're a member, not which
> one. Monad checks it and spends a nullifier. One credential, one action. Four steps. Nothing
> else disclosed.
>
> That's the idea. Here it is, running on Monad testnet. This verdict is read from a real
> transaction. You register once: a passkey prompt, then one wallet signature.
>
> First app: a faucet that pays once per credential. I connect a wallet. I ask to claim, and
> the wallet signs one message. That signature becomes my secret. It never leaves this browser.
> The proof is built right here. No server learns who I am. Then it goes to Monad. The contract
> checks the proof and marks my nullifier as spent. Accepted. Now the same credential tries
> again. Same secret, same app, same nullifier. Rejected. And nothing was even sent.
>
> Second app: a DAO. Same identity, different app, so a fresh nullifier. One credential, one
> vote. The proof is bound to my choice, so nobody can copy it and flip it. Counted. A second
> vote? Rejected.
>
> Third: a registry for AI agents. An agent is recorded only when a verified credential stands
> behind it. No identity is stored.
>
> For a developer, it's two calls: prove, then verify. The hard choice was cost. Checking a
> passkey directly on chain is about thirteen times cheaper. But your public key would follow
> you into every app. So Judges pays for the proof: about 1.1 million gas on Monad.
>
> What it does not prove is one person, one credential. Someone can still register twice.
> Judges says so in its own dissent. What it does prove: a user-verified passkey stood behind
> this wallet. Nothing else disclosed.
>
> Judges. Open source, and live on Monad testnet.

Voice: ElevenLabs, "Daniel" (built-in), `eleven_multilingual_v2`, speed 1.15. Short samples of
three other built-in voices are in `out/voice-samples/` after
`pnpm --filter @judges/video voice -- --samples`.

The evidence passage is there on purpose. The usual advice for a judged demo is to name the
hardest engineering decision while the product is on screen; for Judges that is paying about
1.13M gas for a proof when an on-chain passkey check costs about 88,000.

## 4. Sound

**Music.** "Your Breath" by Eugenio Mininni, from Mixkit. Chosen by measurement, since it was
picked without being able to listen: twelve candidates were downloaded and analysed for tempo,
loudness and structure.

- It is exactly **120 BPM**, so a beat is half a second, 15 frames. Every cut in the opening
  (0:03, 0:08, 0:13, 0:16 …) was already on a half second, so the picture lands on the beat
  without moving anything.
- Its own structure matches the video's: a quiet intro under the title and problem, drums in at
  0:16 as the camera reaches the second station, a fuller section from 0:28 where the live demo
  starts, a breakdown at 1:20–1:28 and a second chorus at 1:30.
- The verdict stamps are placed on bar lines: 1:02 and 1:10 (faucet), 1:26 and 1:30 (DAO, the
  last on the downbeat of the second chorus), 1:40 (agent), 2:21 (closing FILED).

**Mix.** The finished file is at -16 LUFS. Music sits 15 dB under the narration while someone
is speaking, 7 dB higher in the gaps, and a little more before the first line and after the last. The
track's sections differ by about 10 dB as recorded, so `scripts/audio-assets.mjs` evens them
out first. `scripts/finish.mjs` sets the final loudness.

**Effects.** Stamp, paper, marker, click, tick and whoosh, from Mixkit sounds; the stamp is a
wooden hit, a typewriter strike and a low sine layered. They mark what the picture already
does: a sheet landing, a redaction bar, a click, a verdict.

## 5. JudgesPitch (cap 2:00)

Audience: judges deciding whether to advance the project. Problem → solution → why now → ask.

| # | Beat | Length | Visual | Statement |
|---|------|--------|--------|-----------|
| 1 | Title | 3s | Same as demo | "Judges" |
| 2 | Problem | 10s | Same two beats as demo | as demo |
| 3 | Solution in one shot | 10s | Mechanism scene, cut down, or its closing four-panel frame | "Passkey. Proof. No identity leak." |
| 4 | Why Monad / why now | 10s | TBD — the evidence scene from the demo is a start | TBD |
| 5 | Traction / status | 10s | TBD | TBD |
| 6 | Ask | 8s | TBD | TBD |
| 7 | Outro | 5s | Same as demo | repo + chain id |

Rows 4–6 wait on the market doc (`STATUS.md` item F). That is a content gap, not a design one.
Nothing past row 2 is wired into `JudgesPitch.tsx` yet, and it has no narration.

## 6. References

Looked at through the user's own browser with `browser-harness`, or by web search. Reference
only: nothing in the video is copied from these.

**A friend's Remotion video (product "luora", 2:42).** The quality bar. A new kind of visual
every few seconds, subjects that fill the frame, glow and depth, a karaoke caption line
throughout, and long product-UI passages with camera moves and callouts, which is the model
for the exhibit scenes.

**The live site.** Source of the header strip, the margin notes, § numbering, the attempt
ledger and the claim line.

**Pinterest, "redacted document graphic design".** Classified-file layouts: marker bars over
typed fields, rotated rubber stamps, seals, a sheet lit on a dark surface. Where the case-file
treatment came from.

**Pinterest, "fingerprint biometric scan".** Looked at for the passkey station and then not
used: the site's design brief rules it out (§2).

**Pinterest, "motion graphics video", and prompt-motion.com.** One statement per beat in large
type, physical object motion, duotone plus one accent.

**Hackathon demo advice** (reskilll.com, tips.hackathon.com, angelhack.com, the Builderbase
judging-rubric notes). A hook of about 20 seconds on the problem, then the working product,
which should be about half the runtime; show the first screen, the core action and the result;
show a failure being handled; name the hardest engineering decision while the interface is on
screen; no code editor or terminal on screen.

**Screen-recording editors** (Screen Studio, Tella, Open Screen, TechSmith's editing guide).
Zoom to where the click happens and start the move before the click; trim dead air; add
callouts only where they help someone follow.

**Mixing guides** (vidpros.com, voxbooster.com, openclip.app, a BBC/Salford loudness study).
They disagree on numbers. What they agree on: set the voice first, keep music well under it
while someone speaks, let it come up in the gaps, and aim for about -16 to -14 LUFS overall.

## 7. Claims check

The landing page is careful, and the video does not promise more than it does. Its Holding
section says a passkey does not prove one credential = one human, and its Dissent says one
person can still hold several identities. The video now says both out loud (scene 11).

Every figure in the narration and on the notes, and where it comes from:

| Claim | Source |
|---|---|
| "pays once per credential", 0.01 MON | `SybilResistantFaucet.claimAmount()` read from the deployed contract |
| "That signature becomes my secret. It never leaves this browser." | `/demo` page text; the wallet prompt itself says the same |
| "marks my nullifier as spent"; `Poseidon(secret, app, epoch)` | `NullifierRegistry`, circuit |
| "Rejected. And nothing was even sent." | the page reads `isNullifierUsed` before submitting; no wallet prompt appears in the recording |
| "The proof is bound to my choice" | `/demo/dao` page text; `contextHashFor(proposalId, support)` |
| "No identity is stored" (agent registry) | `/demo/agent` page text |
| "about thirteen times cheaper" | landing page §2: ~88,000 gas against ~1,130,000 |
| "your public key would follow you into every app" | landing page §2, the P256VERIFY paragraph |
| "about 1.1 million gas on Monad" | landing page §2 and §5 |
| "This verdict is read from a real transaction" | the Verdict panel reads `NEXT_PUBLIC_JUDGES_SAMPLE_TX`, set to the faucet claim in the recording |

Things the video is careful about:

- **"One person, five votes?"** stays as the statement of the problem in beat 2a. Judges stops
  one *credential* acting twice; the narration says "one credential" every time it describes the
  product, and scene 11 says plainly that someone can register twice.
- **Different app, different nullifier** is said about the nullifier only. The wallet address is
  the same in both apps and visible on chain, so the video does not claim the two actions are
  unlinkable.
- **"live on Monad testnet"** is true of the contracts. The recordings were made on `localhost`
  against those contracts, and the end card says so.
- **Registration is not shown live.** It was done before recording, and the slide over that
  scene says "Done before recording".
- **Speed.** The DAO and agent scenes run at about 2×, the faucet at up to 1.5×, each labelled
  on screen. The proof took about four seconds in the faucet take.

## 8. Status

Done:

- All thirteen scenes of `JudgesDemo`, with narration, captions timed to the voice, music and
  effects, and a loudness pass.
- `src/dev/` contact sheet for checking any scene, or the whole video, at several frames.

Open:

- `JudgesPitch` rows 3–6, and its narration.
- The voice and the music were chosen without being heard. Someone should listen to the
  render and to `out/voice-samples/`, and swap either if it sounds wrong; both are one-line
  changes (README, "Narration" and "Assets").
- The live site cannot register passkeys until `RP_ID` and `RP_ORIGIN` are set on Vercel. The
  end card shows its address, so that has to be fixed before the video is submitted.
