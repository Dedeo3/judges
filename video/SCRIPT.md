# Judges — video script & motion design brief

Working doc for both submission videos. Read this before changing a scene; update it when a
scene changes.

Status: scenes 1–3 of `JudgesDemo` (title, problem, mechanism — the first 28 seconds) are built
in the "case file" style described in §2. Everything after them is still a placeholder.

## 1. Ground rules

Two rounds of feedback shaped these. Round one: the scaffold was "full of text" and boring.
Round two: small centred icons on a flat background were "still too monoton".

- **A different kind of picture every 4–5 seconds.** Never two beats in a row with the same
  composition. Title sheet → node graph and swarm → form being redacted → device → tree →
  ledger → stamp is the current run.
- **The subject fills the frame.** Aim for 50–70% of the frame. A 64px icon in a 1920px frame
  reads as empty no matter how well it is animated.
- **Motion carries the meaning; text labels it.** One statement per beat, six words or fewer,
  with at most one word in the accent colour.
- **Physical motion, not fades.** Things drop, slam, wipe, draw themselves and settle with
  overshoot (`spring()`), and the stage is always drifting (slow push-in or a camera pan).
- **Depth, not flat fills.** Lit background, vignette, film grain, shadows under anything that
  sits on the page.
- **Captions run along the bottom**, lighting up word by word. They are the narration; if a
  voice-over is recorded, they are its script.
- **Real footage beats animation** wherever the real `/demo` flow can show it. Animation is for
  what has no UI: the problem, the Merkle tree, the verifier.

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
| Exhibit A / Exhibit B / § 3 | the site's section numbering | each beat is a piece of evidence |

**Kept out, as on the site** (`DESIGN-FE.md` §6): fingerprints, faces and eyes, because they
suggest biometrics are being collected, and gavels, scales and courthouse pillars. So user
verification is drawn as a PIN being entered, the verdict as a rubber stamp pressing down, and
the seal carries a §. The one face-shaped thing in the video is the silhouette on the KYC form
in beat 2b, which is the practice being argued against and ends up redacted.

Palette and type are the site's: paper `#F1EDE4`, ink `#15130F`, Newsreader and IBM Plex Mono.
Red still means one thing only — something that is or should be rejected (sybil wallets, leaked
data, the second attempt). On the ink scenes red is lifted to `#E2483C` so it stays legible.

Icons are Phosphor (`@phosphor-icons/react`, MIT). Shared pieces live in `src/scenes/stage.tsx`:
`Stage`, `HeaderStrip`, `Caption`, `Stamp`, `RedactBar`, `Rise`, `pop`.

## 3. JudgesDemo (cap 3:00)

Audience: hackathon judges who have never seen the product. It has to answer "what is this and
does it work" mostly through pictures and footage.

| # | Beat | Length | What happens | Statement on screen |
|---|------|--------|--------------|---------------------|
| 1 | Title | 3s | Cover sheet drops onto a desk; wordmark rises letter by letter; rule draws; three redaction bars wipe in; seal draws itself; FILED stamp slams and shakes the sheet | "Judges" · "A wallet, backed by a passkey." · "Nothing else disclosed." |
| 2a | Problem — sybil (ink) | 5s | One person fans out into five wallets while a vote counter ticks up in red; camera pulls back and the frame floods with wallet dots as the counter runs to 5,000 | "One person, five votes?" |
| 2b | Problem — privacy (paper) | 5s | A KYC form is scanned, its fields fly into "what the verifier keeps", then every field is redacted, the verifier's copy disappears and the form is stamped | "Prove you're real. Not who you are." |
| 3 | Mechanism | 15s | Camera travels a track of four stations, 3s each: phone holding a key while a PIN is entered → Merkle path lighting up, leaves redacted, proof chip appears → proof drops into a block, nullifier typed and marked consumed → a stamp presses down and leaves ACCEPTED, second attempt REJECTED. Ends on all four side by side | "Passkey" "Proof" "Chain" "Verdict" |
| 4 | Real demo footage A | ~45–60s | Screen recording: register passkey, connect wallet (Privy), generate proof, verify on-chain | lower-third captions only |
| 5 | Real demo footage B | ~20–30s | Screen recording: same credential tries again → rejected | caption, then verdict stamp |
| 6 | Verdict (accepted) | 3s | Stamp | "ACCEPTED" |
| 7 | Verdict (rejected) | 3s | Stamp | "REJECTED — nullifier already used" |
| 8 | Outro | 5s | Logo, repo URL, chain id | "github.com/Dedeo3/judges" |

Total ~110–130s, leaving headroom under the cap for footage that runs long.

Captions as built (edit them in each scene's `<Caption lines={…}>`):

- 2a: "A wallet costs nothing to make." → "So one person can vote five times — or five thousand."
- 2b: "The usual fix: hand over who you are." → "Judges takes a proof instead."
- 3: "A passkey lives on your device. Biometric or PIN unlocks it." → "It yields a
  zero-knowledge proof: a member of the set, not which one." → "JudgesVerifier on Monad checks
  it and consumes a nullifier." → "One credential, one action. Accepted." → "Four steps. Nothing
  else disclosed."

## 4. JudgesPitch (cap 2:00)

Audience: judges deciding whether to advance the project. Problem → solution → why now → ask.

| # | Beat | Length | Visual | Statement |
|---|------|--------|--------|-----------|
| 1 | Title | 3s | Same as demo | "Judges" |
| 2 | Problem | 10s | Same two beats as demo | as demo |
| 3 | Solution in one shot | 10s | Mechanism scene, cut down, or its closing four-panel frame | "Passkey. Proof. No identity leak." |
| 4 | Why Monad / why now | 10s | TBD | TBD |
| 5 | Traction / status | 10s | TBD | TBD |
| 6 | Ask | 8s | TBD | TBD |
| 7 | Outro | 5s | Same as demo | repo + chain id |

Rows 4–6 wait on the market doc (`STATUS.md` item F). That is a content gap, not a design one.
Row 3 is not wired into `JudgesPitch.tsx` yet.

## 5. References

Looked at through the user's own browser with `browser-harness`. Reference only — nothing was
downloaded from these; every asset in the video is drawn in code or comes from an MIT icon set.

**A friend's Remotion video (product "luora", 2:42).** The quality bar. What it does: an
illustrated scene to open, then a dot-grid statistic, a wall of flooding text, a gauge card, a
terminal, long product-UI passages with camera moves and callouts, a flow diagram converging on
the logo, and a typed URL to close. A new kind of visual every few seconds, subjects that fill
the frame, glow and depth, and a karaoke caption line throughout. Its dot-grid statistic is the
direct ancestor of our wallet flood.

**The live site.** Source of the header strip, the "Opinion" margin note, § numbering, the
attempt ledger and the claim line.

**Pinterest, "redacted document graphic design".** Classified-file layouts: marker bars over
typed fields, rotated rubber stamps, seals, photo boxes, a sheet lit on a dark surface. This is
where the case-file treatment came from.

**Pinterest, "fingerprint biometric scan".** Looked at for the passkey station and then not
used: the first build had a fingerprint under a scan line, which the site's design brief rules
out (see §2), so the station shows a PIN instead.

**Pinterest, "motion graphics video", and prompt-motion.com** (first pass). One statement per
beat in large type, physical object motion, shape-driven transitions, duotone plus one accent.

## 6. Claims check

The landing page is careful, and the video should not promise more than it does. Its Holding
section says a passkey does not prove one credential = one human, and its Dissent says one
person can still hold several identities.

- Safe, and used: "a wallet, backed by a passkey that passed user verification", "nothing else
  disclosed", "one credential, one action per application", "consumes a nullifier".
- **Open question:** beat 2a asks "One person, five votes?". Judges stops one *credential*
  voting twice; it does not stop one person registering five passkeys. A judge who reads the
  Dissent may notice. Options: keep it as a statement of the problem and let the demo footage
  say "one credential, one vote"; or change the line to "One wallet. Whose is it?". Not changed
  yet — this wording was chosen by the team.

## 7. Status

Done:

- Scenes 1–3 rebuilt as above and re-timed in `JudgesDemo.tsx` (3s / 10s / 15s);
  `JudgesPitch.tsx` re-timed to match for the two scenes it shares.
- `Verdict` and `Outro` now share the lit background and grain, but are otherwise unchanged.
- `src/dev/` contact sheet for checking a scene at several frames in one still (see README).

Open:

- Record `/demo` and drop the footage into `public/` (rows 4–5). This needs an identity
  registered and a root posted on-chain first.
- `Verdict` (rows 6–7) and `Outro` are still plain cards. Once real footage is in, the verdict
  can probably be the footage itself with a stamp over it.
- Pitch rows 3–6.
- Voice-over or music. The captions carry the narration for now; nothing is audible yet.
- Decide the wording in §6.
