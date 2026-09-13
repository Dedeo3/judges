import { buildConnectUrl, isConnectMessageFor, newRequestId, normalizeOrigin, type ConnectRequest } from "./connect";

const POPUP_FEATURES = "popup,width=460,height=720";
const CLOSED_POLL_MS = 500;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export class JudgesPopupError extends Error {
  constructor(
    message: string,
    public readonly code: "popup_blocked" | "closed" | "cancelled" | "timeout" | "failed",
  ) {
    super(message);
    this.name = "JudgesPopupError";
  }
}

/**
 * Opens Judges' /connect page and resolves with whatever proof it posts back.
 *
 * Deliberately NOT an async function: `window.open` has to run synchronously inside the user's
 * click, or browsers block the popup. Every check that could await happens after it's open.
 *
 * Accepts a message only when all three hold — any one alone is spoofable:
 *  - `event.origin` is exactly Judges' origin (not a subdomain, not a prefix match)
 *  - `event.source` is the window this call opened (not some other Judges tab)
 *  - the message carries this call's random request id (not a stale or parallel request's)
 */
export function requestProofViaPopup(params: {
  judgesOrigin: string;
  request: Omit<ConnectRequest, "requestId" | "requestingOrigin">;
  timeoutMs?: number;
}): Promise<unknown> {
  const judgesOrigin = normalizeOrigin(params.judgesOrigin);
  if (!judgesOrigin) {
    return Promise.reject(new JudgesPopupError(`Invalid judgesOrigin: ${params.judgesOrigin}`, "failed"));
  }

  const requestingOrigin = window.location.origin;
  const requestId = newRequestId();
  const url = buildConnectUrl(judgesOrigin, { ...params.request, requestingOrigin, requestId });

  const popup = window.open(url, `judges-connect-${requestId}`, POPUP_FEATURES);
  if (!popup) {
    return Promise.reject(
      new JudgesPopupError(
        "The Judges popup was blocked. Call judges.prove() directly from a click handler.",
        "popup_blocked",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (outcome: () => void) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      clearInterval(closedPoll);
      clearTimeout(timeout);
      outcome();
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== judgesOrigin) return;
      if (event.source !== popup) return;
      if (!isConnectMessageFor(event.data, requestId)) return;

      const message = event.data;
      if (message.type === "judges:proof") {
        finish(() => resolve(message.proof));
      } else if (message.type === "judges:cancel") {
        finish(() => reject(new JudgesPopupError("The user cancelled verification.", "cancelled")));
      } else {
        finish(() => reject(new JudgesPopupError(`Verification failed: ${message.reason}`, "failed")));
      }
    };

    window.addEventListener("message", onMessage);

    // A user closing the window sends no message, so watch for it — otherwise prove() would hang
    // until the timeout.
    const closedPoll = setInterval(() => {
      if (popup.closed) {
        finish(() => reject(new JudgesPopupError("The Judges window was closed before finishing.", "closed")));
      }
    }, CLOSED_POLL_MS);

    const timeout = setTimeout(() => {
      finish(() => {
        popup.close();
        reject(new JudgesPopupError("Timed out waiting for verification.", "timeout"));
      });
    }, params.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  });
}
