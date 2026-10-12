"use client";

import { useEffect } from "react";

/** Longer than the whole load sequence in globals.css, counted from hydration. */
const SETTLE_MS = 3200;

/**
 * The root element is served with `is-loading`, which is what the load sequence in globals.css
 * keys on. Dropping the class once it has played means a page reached by in-app navigation shows
 * up finished (it gets the page cross-fade instead) rather than replaying the sequence each time.
 * Without JavaScript the class simply stays; the sequence still plays once and ends.
 */
export function LoadSequence() {
  useEffect(() => {
    const timer = setTimeout(() => document.documentElement.classList.remove("is-loading"), SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
