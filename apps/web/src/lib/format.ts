/** Cuts the middle out of a long hex value: `0x3f7a…e864`. */
export function shorten(value: string, head = 6, tail = 4): string {
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}
