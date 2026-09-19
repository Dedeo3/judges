"use client";

import { useEffect, useRef, useState } from "react";
import { shorten } from "@/lib/format";

/** A long hex value cut in the middle. Click copies the full value; the title shows it. */
export function Hash({ value, head = 6, tail = 4 }: { value: string; head?: number; tail?: number }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return; // clipboard unavailable (insecure context): leave the value as it is, no false "copied"
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" className="hash" title={value} onClick={copy} aria-label={`Copy ${value}`}>
      {copied ? "copied" : shorten(value, head, tail)}
    </button>
  );
}
