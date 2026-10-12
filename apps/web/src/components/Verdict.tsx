"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A verdict is either ACCEPTED (plain ink, the tick set in with a small flourish) or REJECTED (the
 * only place the accent colour appears). The REJECTED stamp lands once, when it scrolls into view
 * or when a demo actually receives a rejection. Reduced-motion users get both with no animation
 * (see globals.css).
 *
 * `loadDelayMs` is for a stamp that is part of a page's load sequence: while that sequence is
 * still playing, the stamp waits this long after mounting so it lands after its row has appeared.
 */
export function Verdict({
  status,
  reason,
  loadDelayMs = 0,
}: {
  status: "accepted" | "rejected";
  reason?: string;
  loadDelayMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [stamped, setStamped] = useState(false);

  useEffect(() => {
    if (status !== "rejected") return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const wait = document.documentElement.classList.contains("is-loading") ? loadDelayMs : 0;
    const mountedAt = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          timer = setTimeout(() => setStamped(true), Math.max(0, wait - (performance.now() - mountedAt)));
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [status, loadDelayMs]);

  if (status === "accepted") {
    return (
      <span className="verdict verdict--accepted">
        <span className="tick" aria-hidden="true">
          ✓
        </span>
        <span>Accepted</span>
      </span>
    );
  }

  return (
    <span className="verdict">
      <span ref={ref} className={`stamp${stamped ? " is-stamped" : ""}`}>
        Rejected
      </span>
      {reason && <span className="mono muted" style={{ fontWeight: 400, textTransform: "none" }}>{reason}</span>}
    </span>
  );
}
