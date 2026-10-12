/** A sound effect on a timeline, in frames. Files are built by `scripts/audio-assets.mjs`. */
export type Sfx = { name: "stamp" | "tick" | "paper" | "marker" | "click" | "whoosh"; at: number; gain?: number };
