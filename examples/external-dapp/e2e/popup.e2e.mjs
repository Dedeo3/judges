// Cross-origin popup E2E against a real Chrome engine, in an isolated throwaway profile.
//
// Needs both origins running first:
//   pnpm --filter @judges/web dev          # Judges on http://localhost:3000
//   cd examples/external-dapp && npm run build && npm run serve   # this dApp on http://localhost:4000
// then: npm run e2e   (CHROME_PATH overrides the default macOS Chrome location)
//
// What this proves, and what it doesn't. It drives the real popup flow and the attacks against it:
// consent rendering, cancel/close, a forged origin, the browser dropping mis-targeted messages, the
// SDK ignoring a message from the wrong window, and the SDK rejecting a proof for another app's
// namespace. It does NOT run a passkey ceremony or generate a real proof — that needs Neon
// and a real authenticator — so the proof messages in cases 6-7 are injected from the popup window,
// using the same message shape and postMessage call ConnectFlow uses.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const JUDGES = "http://localhost:3000";
const DAPP = "http://localhost:4000";
const WALLET = "0x000000000000000000000000000000000000bEEF";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForPopup(browser, predicate, timeout = 15000) {
  const target = await browser.waitForTarget((t) => t.type() === "page" && predicate(t.url()), { timeout });
  const page = await target.page();
  await page.waitForFunction(() => document.readyState === "complete");
  return page;
}

async function resultText(page) {
  return page.$eval("#result", (el) => el.textContent);
}

async function waitForResult(page, predicate, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const text = await resultText(page);
    if (predicate(text)) return text;
    await sleep(200);
  }
  return resultText(page);
}

async function openDapp(browser) {
  const page = await browser.newPage();
  await page.goto(DAPP, { waitUntil: "load" });
  await page.$eval("#wallet", (el, v) => (el.value = v), WALLET);
  return page;
}

const userDataDir = mkdtempSync(join(tmpdir(), "judges-e2e-"));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir,
  args: ["--no-first-run", "--no-default-browser-check"],
});

try {
  // ---------------------------------------------------------------- 1. happy path: consent renders
  {
    const dapp = await openDapp(browser);
    const popupPromise = waitForPopup(browser, (u) => u.startsWith(`${JUDGES}/connect`));
    await dapp.click("#verify");
    const popup = await popupPromise;
    await popup.waitForFunction(() => document.body.innerText.includes("asking you"), { timeout: 15000 });
    const text = await popup.evaluate(() => document.body.innerText);

    check("popup opens on the Judges origin", new URL(popup.url()).origin === JUDGES);
    check("consent names the real requesting site", text.includes(`${DAPP} is asking you`));
    check("consent shows the namespaced app id", text.includes(`${DAPP}/airdrop`));
    check("consent shows the wallet being credited", text.includes("0x0000…bEEF"));

    // ---------------------------------------------------------------- 2. cancel round-trip
    const cancel = await popup.evaluateHandle(() =>
      [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Cancel"),
    );
    await cancel.click();
    const after = await waitForResult(dapp, (t) => t.includes("cancelled"));
    check("cancel in the popup reaches the opener and rejects prove()", after.includes('"cancelled"'), after.replace(/\s+/g, " "));
    await dapp.close();
  }

  // ---------------------------------------------------------------- 3. closing the window
  {
    const dapp = await openDapp(browser);
    const popupPromise = waitForPopup(browser, (u) => u.startsWith(`${JUDGES}/connect`));
    await dapp.click("#verify");
    const popup = await popupPromise;
    await popup.close();
    const after = await waitForResult(dapp, (t) => t.includes("closed"));
    check("closing the popup rejects prove() instead of hanging", after.includes('"closed"'));
    await dapp.close();
  }

  // ---------------------------------------------------------------- 4. forged origin name
  {
    const dapp = await openDapp(browser);
    const forged = new URLSearchParams({
      origin: "https://trusted.example",
      appId: "airdrop",
      assurance: "user_verified",
      wallet: WALLET,
      requestId: "00000000-0000-4000-8000-000000000001",
    });
    const popupPromise = waitForPopup(browser, (u) => u.includes("trusted.example"));
    await dapp.evaluate((url) => window.open(url, "forged", "popup"), `${JUDGES}/connect?${forged}`);
    const popup = await popupPromise;
    await popup.waitForFunction(() => document.body.innerText.includes("JUDGES"), { timeout: 15000 });
    await sleep(500);
    const text = await popup.evaluate(() => document.body.innerText);
    check(
      "a site claiming another site's origin is refused (referrer mismatch)",
      text.includes("looks forged") && !text.includes("asking you"),
    );
    await popup.close();
    await dapp.close();
  }

  // ---------------------------------------------------------------- 5. targetOrigin enforcement
  // The core guarantee relies on the browser dropping a postMessage whose targetOrigin doesn't
  // match the real opener. Verify that assumption on a real engine, using the exact call shape
  // ConnectFlow uses.
  {
    const dapp = await openDapp(browser);
    await dapp.evaluate(() => {
      window.__received = [];
      window.addEventListener("message", (e) => window.__received.push({ origin: e.origin, data: e.data }));
    });
    const popupPromise = waitForPopup(browser, (u) => u.startsWith(`${JUDGES}/connect`));
    await dapp.click("#verify");
    const popup = await popupPromise;
    await popup.waitForFunction(() => document.body.innerText.includes("asking you"), { timeout: 15000 });

    await popup.evaluate(() => {
      window.opener.postMessage({ probe: "to-wrong-origin" }, "http://localhost:5000");
      window.opener.postMessage({ probe: "to-real-origin" }, "http://localhost:4000");
    });
    await sleep(800);
    const received = await dapp.evaluate(() => window.__received.map((m) => m.data.probe).filter(Boolean));
    check("message targeted at a different origin is dropped by the browser", !received.includes("to-wrong-origin"));
    check("message targeted at the real opener origin is delivered (control)", received.includes("to-real-origin"));

    // ---------------------------------------------------------------- 6. source + requestId checks
    // A correctly-shaped proof message with the right requestId, but from a DIFFERENT Judges
    // window than the one this prove() call opened, must be ignored.
    const requestId = new URL(popup.url()).searchParams.get("requestId");
    const decoyPromise = waitForPopup(browser, (u) => u.includes("decoy=1"));
    await dapp.evaluate((url) => window.open(url, "decoy", "popup"), `${JUDGES}/connect?decoy=1`);
    const decoy = await decoyPromise;
    await decoy.evaluate((rid) => {
      window.opener.postMessage(
        {
          type: "judges:proof",
          requestId: rid,
          proof: {
            verified: true,
            proof: `0x${"11".repeat(256)}`,
            walletCommitment: `0x${"22".repeat(32)}`,
            nullifier: `0x${"33".repeat(32)}`,
            domain: `0x${"44".repeat(32)}`,
            contextHash: `0x${"55".repeat(32)}`,
            wallet: "0x000000000000000000000000000000000000bEEF",
            appId: "http://localhost:4000/airdrop",
          },
        },
        "http://localhost:4000",
      );
    }, requestId);
    await sleep(1000);
    const stillWaiting = await resultText(dapp);
    check(
      "a proof message from a Judges window other than the opened popup is ignored",
      stillWaiting.includes("Waiting"),
      stillWaiting.replace(/\s+/g, " "),
    );

    // Now the real popup sends the same message — this one must be accepted.
    await popup.evaluate((rid) => {
      window.opener.postMessage(
        {
          type: "judges:proof",
          requestId: rid,
          proof: {
            verified: true,
            proof: `0x${"11".repeat(256)}`,
            walletCommitment: `0x${"22".repeat(32)}`,
            nullifier: `0x${"33".repeat(32)}`,
            domain: `0x${"44".repeat(32)}`,
            contextHash: `0x${"55".repeat(32)}`,
            wallet: "0x000000000000000000000000000000000000bEEF",
            appId: "http://localhost:4000/airdrop",
          },
        },
        "http://localhost:4000",
      );
    }, requestId);
    const accepted = await waitForResult(dapp, (t) => t.includes("verified"));
    check("the same message from the real popup is accepted", accepted.includes('"verified"'));
    await decoy.close().catch(() => {});
    await popup.close().catch(() => {});
    await dapp.close();
  }

  // ---------------------------------------------------------------- 7. wrong-namespace proof rejected
  {
    const dapp = await openDapp(browser);
    const popupPromise = waitForPopup(browser, (u) => u.startsWith(`${JUDGES}/connect`));
    await dapp.click("#verify");
    const popup = await popupPromise;
    await popup.waitForFunction(() => document.body.innerText.includes("asking you"), { timeout: 15000 });
    const requestId = new URL(popup.url()).searchParams.get("requestId");
    await popup.evaluate((rid) => {
      window.opener.postMessage(
        {
          type: "judges:proof",
          requestId: rid,
          proof: {
            verified: true,
            proof: `0x${"11".repeat(256)}`,
            walletCommitment: `0x${"22".repeat(32)}`,
            nullifier: `0x${"33".repeat(32)}`,
            domain: `0x${"44".repeat(32)}`,
            contextHash: `0x${"55".repeat(32)}`,
            wallet: "0x000000000000000000000000000000000000bEEF",
            appId: "https://someone-else.example/airdrop",
          },
        },
        "http://localhost:4000",
      );
    }, requestId);
    const after = await waitForResult(dapp, (t) => t.includes("error"));
    check("a proof for a different app namespace is rejected by the SDK", after.includes("expected"), after.replace(/\s+/g, " "));
    await popup.close().catch(() => {});
    await dapp.close();
  }

  // ---------------------------------------------------------------- 8. clickjacking headers
  {
    const res = await fetch(`${JUDGES}/connect`);
    check("/connect sends X-Frame-Options: DENY", res.headers.get("x-frame-options") === "DENY");
    check(
      "/connect sends frame-ancestors 'none'",
      (res.headers.get("content-security-policy") ?? "").includes("frame-ancestors 'none'"),
    );
    check("/connect does not set a COOP that would sever window.opener", !(res.headers.get("cross-origin-opener-policy") ?? "").includes("same-origin"));
  }
} finally {
  await browser.close();
  rmSync(userDataDir, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
