# Recording the demo footage — step by step

This is the screen recording that goes into `JudgesDemo` after the animated opening (0:28
onward). Read sections 1 and 2 before touching the record button: two facts about how the
protocol works decide how you have to plan the takes.

The takes in the current video were recorded on 2026-10-12 on `localhost`, with the faucet,
DAO and agent flows each as one continuous file (accepted, then rejected). The scenes address
those files by the second and by pixel, so if you record again, keep the same window size and
zoom, and expect to re-check the numbers in `src/scenes/Claims.tsx` and `src/scenes/Site.tsx`.

## 1. Two things to know first

**Every on-chain action works once per identity, per app.** The nullifier is
`Poseidon(secret, appId, epoch)`, so one wallet's identity gets exactly one faucet claim, one
agent registration, and one DAO vote. There is no second take of an ACCEPTED shot with the same
wallet: the second attempt is the REJECTED shot. Rehearse with a different wallet from the one
you film.

That includes the DAO: the contract uses one domain for the whole DAO, so an identity that voted
on proposal 1 is also rejected on proposal 2. Do not plan a second accepted vote on another
proposal.

**A proof only verifies against the root that is on-chain right now.** Each new identity changes
the root. So register every wallet you will use first, then post the root once, then record. If
anything registers after that, proofs fail with `UnknownRoot` until the root is posted again.

## 2. Decide where you record

| | Deployed site (`judges-two.vercel.app`) | Local (`http://localhost:3000`) |
|---|---|---|
| Use when | it has been redeployed from current `main` | the redeploy is not done yet |
| Shows | a real URL judges can open themselves | `localhost` in the address bar |
| Needs | `NEXT_PUBLIC_PRIVY_APP_ID`, `RP_ID`, `RP_ORIGIN` set on Vercel | port **3000** exactly |

Pick one and do everything there, preparation included. A passkey belongs to the hostname it was
created on, so one made on `localhost` does not work on the Vercel site, or the other way round.

For local: the passkey origin is `http://localhost:3000`, so the app must be on port 3000. Stop
Remotion Studio first if it is running there, then:

```bash
pnpm --filter @judges/web dev
```

## 3. Preparation, off camera

Do all of this before recording. None of it needs to be on film.

**Wallets.** Three accounts in your wallet extension, each with a little Monad Testnet MON for
gas:

- `R` — rehearsal. You will burn its one-time actions practising.
- `T` — the take. Do not use it for anything on-chain until you are recording.
- `S` — spare, in case a take goes wrong.

**Browser.** A separate Chrome profile with only the wallet extension installed. No other tabs,
bookmarks bar hidden (`Ctrl+Shift+B`), page zoom 125% so the text reads at 1080p, Windows
notifications off (Do not disturb).

**Register.** On `/demo`:

1. Type a display name, press **Register with passkey**, approve the Windows Hello prompt.
   Expect `✓ ACCEPTED` and `Passkey registered (credential …)`. Once is enough; the same
   passkey gates all three wallets.
2. For each of `R`, `T`, `S`: press **Connect wallet**, choose the account in the Privy window
   (approve "add / switch network" if the wallet asks), then press **Sign identity message and
   register (passkey-gated)**, sign in the wallet, approve the passkey prompt. Expect
   `Identity registered (leaf N). Root 0x… must be posted on-chain before proofs verify.`
   Between wallets, switch the account in the extension and reload the page before connecting
   again, and check the address on the button is the one you meant.

**Post the root.** Open `/api/commitments/root` on the same site, copy `rootHex`, and run this
yourself in a terminal that is not on screen:

```bash
cast send 0x58CC9E5BbEe44D143905e34307D361f621826e8a "postRoot(bytes32)" <rootHex> \
  --rpc-url https://testnet-rpc.monad.xyz --account deployer-dio
```

**Warm up.** With wallet `T` connected on `/demo`, press **Generate a proof (ZK, in-browser)**.
This proves without sending a transaction, so it costs nothing and can be repeated. It also
downloads the prover files (about 7.7 MB), so the on-camera run does not stall on a download. Expect
`ZK proof generated in-browser, bound to 0x…`. If you see `Register your identity above first`,
that wallet is not registered; if a later on-chain step says `UnknownRoot`, post the root again.

**Rehearse with `R`.** Run the faucet claim twice (section 5, clips 1 and 2) and note:

- how long proving takes on your machine;
- that the second attempt ends in the red REJECTED stamp. The page reads the nullifier registry
  itself before sending anything, so on that attempt you sign and prove as usual but the wallet
  never asks you to confirm a transaction. This path is checked against the live contract but
  has not been run with a real wallet yet, so if it looks different, tell me before you film.

## 4. Recorder settings

- **OBS Studio, Display Capture** — not a window or tab capture. The passkey prompt and the
  wallet's windows are separate from the page and a tab capture will not show them.
- 1920×1080, 30 fps, MP4 or MKV, cursor visible, no audio. The captions carry the narration.
- Taskbar set to auto-hide. Chrome maximised, one tab.
- Move the cursor slowly and stop for about a second before and after each click.
- Do not rush the waits and do not cut them. Leave the recording running while it proves; the
  waits get shortened in the edit.
- Leave two seconds of stillness at the start and end of every clip.

## 5. The clips

Record each as its own file. Stop and restart the recorder between clips.

### Clip 1 — Faucet claim, accepted (the main shot, about 30s)

Wallet `T`.

1. Start on `/demo/faucet`, page already loaded, cursor resting off the buttons.
2. Press **Connect wallet**, choose `T`. The button becomes `Connected: 0x1234…abcd`.
3. Press **Verify with Judges and claim**.
4. A list of three steps appears and ticks off as it goes:
   - *Read the action binding from the contract*
   - *Sign the identity message, then prove in your browser* — sign in the wallet, then wait
   - *Submit to Monad* — confirm the transaction in the wallet
5. Expect `✓ ACCEPTED` and `Done — nullifier consumed for this domain. View transaction`. It
   appears once the transaction is mined, a moment after you confirm it, not the instant you do.
6. Hold three seconds. Then click **View transaction** and hold on the explorer page for three
   more, so the real transaction is on film.

Copy that transaction hash somewhere. It is needed for clip 5.

### Clip 2 — Same credential again, rejected (about 15s)

Same page, same wallet, straight after clip 1.

1. Press **Verify with Judges and claim** again.
2. Sign and let it prove as before.
3. The third step fails with `✗`, and the red **REJECTED** stamp lands next to
   `nullifier already used`. No transaction prompt appears this time: the registry already
   shows the nullifier as spent, so nothing is sent.
4. Hold four seconds on the stamp.

### Clip 3 — DAO vote, then a second vote (optional, about 25s)

Wallet `T` on `/demo/dao`. Proposal id `1`, **Vote yes** ticked.

1. Connect, press **Verify with Judges and vote yes**, sign, wait, confirm. Expect `✓ ACCEPTED`.
2. Press it again. Expect REJECTED.

### Clip 4 — Registration (optional, about 25s)

Only if you want the passkey step on film. It needs a wallet that is not yet registered, and
the root has to be posted again afterwards, off camera, before that wallet can prove anything.

1. `/demo`, press **Register with passkey**, approve the prompt.
2. Press **Connect wallet**, then **Sign identity message and register (passkey-gated)**.
3. Hold on `Identity registered (leaf N)…`.

### Clip 5 — The site itself (optional, about 15s)

After clip 1, set `NEXT_PUBLIC_JUDGES_SAMPLE_TX` to the hash from clip 1 (in Vercel, then
redeploy; or in `apps/web/.env.local`, then restart the dev server). The Verdict panel on the
landing page then shows that real transaction instead of "No verification has been recorded".

1. Start recording, then load `/` so the opening sequence is on film.
2. Wait for the REJECTED stamp in the ledger.
3. Scroll down slowly, in one continuous movement, through Evidence, Procedure and Docket.

## 6. Keep off the screen

- Seed phrases, the keystore password prompt, and any terminal.
- `.env` files and the Neon or Vercel dashboards.
- Other browser profiles, chats and notifications.

The wallet address and transaction hashes are public and fine to show.

## 7. Afterwards

1. Put the files in `video/public/` under the names the scenes load: `A2-landing.mp4` (site
   walkthrough), `B-faucet-accepted-rejected.mp4`, `C-dao-accepted-rejected.mp4`,
   `D-agent-accepted.mp4`.
2. Step through each new file and update the recording times and positions in
   `src/scenes/Claims.tsx` and `src/scenes/Site.tsx`. The contact sheet (README, "Checking a
   scene") shows quickly whether a shot still lines up.
3. Raw screen recordings are large and are ignored by git (`video/.gitignore`). Keep your own
   copy; the video cannot be rendered without them.

## 8. If something goes wrong

| What you see | Cause | Fix |
|---|---|---|
| The third step fails with a revert the page cannot name, and no REJECTED stamp | almost always `UnknownRoot`: the current root is not on-chain, or someone registered after you posted it | post the root again |
| The same, after posting the root again | possibly `InvalidProof`: the deployed verifier does not match the prover files | stop and tell me; this is not a recording problem |
| `Register your identity above first` | this wallet has no identity yet | register it on `/demo`, then post the root |
| Passkey prompt fails or never appears | wrong hostname or port for `RP_ID` / `RP_ORIGIN` | use the exact origin from section 2 |
| "Wallet connect is not configured" | `NEXT_PUBLIC_PRIVY_APP_ID` is missing | set it and restart or redeploy |
| ACCEPTED when you expected REJECTED | you switched wallet between the two attempts | repeat with the same wallet |
| A take went wrong after the transaction was sent | that wallet's one action for this app is spent | switch to wallet `S` |
