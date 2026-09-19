"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A verdict is either ACCEPTED (plain ink) or REJECTED (the only place the accent colour appears).
 * The REJECTED stamp lands once, when it scrolls into view or when a demo actually receives a
 * rejection. Reduced-motion users get the stamp with no animation (see globals.css).
 */
export function Verdict({ status, reason }: { status: "accepted" | "rejected"; reason?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [stamped, setStamped] = useState(false);

  useEffect(() => {
    if (status !== "rejected") return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setStamped(true);
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [status]);

  if (status === "accepted") {
    return (
      <span className="verdict">
        <span aria-hidden="true">✓</span>
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
