export class JudgesApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "JudgesApiError";
  }
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** POSTs JSON with a couple of retries on transient network/5xx failures. Not retried: 4xx. */
export async function postJson<T>(url: string, body: unknown, maxRetries: number): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        if (isRetryableStatus(res.status) && attempt < maxRetries) {
          lastError = new JudgesApiError(`Request to ${url} failed with ${res.status}`, res.status, errorBody);
          await delay(2 ** attempt * 200);
          continue;
        }
        throw new JudgesApiError(`Request to ${url} failed with ${res.status}`, res.status, errorBody);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof JudgesApiError) throw err;
      lastError = err;
      if (attempt < maxRetries) {
        await delay(2 ** attempt * 200);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Request to ${url} failed`);
}
