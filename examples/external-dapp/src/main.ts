import { Judges, JudgesPopupError, namespacedAppId, type JudgesProof } from "@judges/sdk";

type Eip1193 = { request(args: { method: string; params?: unknown[] }): Promise<unknown> };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const judgesOriginInput = $<HTMLInputElement>("judges-origin");
const appIdInput = $<HTMLInputElement>("app-id");
const walletInput = $<HTMLInputElement>("wallet");
const namespaceEl = $<HTMLElement>("namespace");
const resultEl = $<HTMLElement>("result");

function renderNamespace() {
  try {
    namespaceEl.textContent = namespacedAppId(window.location.origin, appIdInput.value.trim());
  } catch {
    namespaceEl.textContent = "(invalid app id)";
  }
}

function show(value: unknown) {
  resultEl.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

appIdInput.addEventListener("input", renderNamespace);
renderNamespace();

$<HTMLButtonElement>("connect").addEventListener("click", async () => {
  const ethereum = (window as unknown as { ethereum?: Eip1193 }).ethereum;
  if (!ethereum) {
    show("No injected wallet — paste a wallet address instead.");
    return;
  }
  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  walletInput.value = accounts[0] ?? "";
});

$<HTMLButtonElement>("verify").addEventListener("click", () => {
  // No `await` before judges.prove(): it opens a popup, and browsers only allow that
  // synchronously inside the click handler.
  let judges: Judges;
  try {
    judges = new Judges({
      network: "monad-testnet",
      appId: appIdInput.value.trim(),
      judgesOrigin: judgesOriginInput.value.trim(),
    });
  } catch (err) {
    show(err instanceof Error ? err.message : String(err));
    return;
  }

  show("Waiting for the Judges popup…");

  judges
    .prove({ assurance: "user_verified", wallet: walletInput.value.trim() as `0x${string}` })
    .then((proof: JudgesProof) => {
      // A real dApp would now submit this on-chain — see docs/integration.md.
      show({ status: "verified", appId: proof.appId, wallet: proof.wallet, nullifier: proof.nullifier, domain: proof.domain });
    })
    .catch((err: unknown) => {
      if (err instanceof JudgesPopupError) {
        show({ status: err.code, message: err.message });
      } else {
        show({ status: "error", message: err instanceof Error ? err.message : String(err) });
      }
    });
});
