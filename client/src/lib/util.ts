function hashString(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
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
