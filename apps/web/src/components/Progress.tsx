import type { ReactNode } from "react";

/** A line of status text over a hairline that sweeps for as long as the work is in flight. */
export function Working({ children }: { children: ReactNode }) {
  return (
    <p className="working muted">
      <span>{children}</span>
      <span className="sweep" aria-hidden="true" />
    </p>
  );
}

const MARK = { todo: "·", active: "›", done: "✓", failed: "✗" } as const;

/**
 * The stages of a run, ticked off as they finish. `current` is the stage in flight; a value equal
 * to `labels.length` means all of them are done. `failed` marks the current stage as the one
 * that stopped the run.
 */
export function Steps({ labels, current, failed = false }: { labels: readonly string[]; current: number; failed?: boolean }) {
  return (
    <ol className="steps">
      {labels.map((label, i) => {
        const state = i < current ? "done" : i > current ? "todo" : failed ? "failed" : "active";
        return (
          <li key={label} data-state={state}>
            <span className="step-mark" aria-hidden="true">
              {MARK[state]}
            </span>
            <span>
              {label}
              {state === "done" && <span className="sr-only"> (done)</span>}
              {state === "failed" && <span className="sr-only"> (failed)</span>}
              {state === "active" && <span className="sweep" aria-hidden="true" style={{ marginTop: "0.375rem" }} />}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
