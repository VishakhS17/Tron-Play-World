const MAX_DENOMINATOR = 999_999;

/**
 * Normalize user/CSV text to canonical `1:{n}`.
 * Accepts denominator only (`64`) or full ratio (`1:64`).
 */
export function normalizeDiecastScale(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const compact = t.replace(/\s/g, "").toLowerCase();

  const ratio = /^1:(\d+)$/.exec(compact);
  if (ratio) {
    const d = parseInt(ratio[1], 10);
    if (d >= 1 && d <= MAX_DENOMINATOR) return `1:${d}`;
    return null;
  }

  if (/^\d+$/.test(compact)) {
    const d = parseInt(compact, 10);
    if (d >= 1 && d <= MAX_DENOMINATOR) return `1:${d}`;
    return null;
  }

  return null;
}
