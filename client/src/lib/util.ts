import Humanize from "humanize-plus";

const SEED = 0x1d8a88a9;

function hashString(str: string): number {
  let h1 = 0xdeadbeef ^ SEED,
    h2 = 0x41c6ce57 ^ SEED;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function getNameColor(name: string): string {
  const num = hashString(name);
  const r = ((num & 0x00ff0000) >> 16) >> 1;
  const g = ((num & 0x0000ff00) >> 8) >> 1;
  const b = num & (0x000000ff >> 1);
  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(Math.min(t, 1.0), 0.0);
}

export function formatScore(num: number): string {
  return Humanize.formatNumber(Math.floor(num), 0);
}
