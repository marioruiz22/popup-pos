/** Distinct accents for draft tab letters. Avoid brand purple. */
const ORDER_ACCENT_COLORS = [
  '#0d9488', // teal — A
  '#ea580c', // orange — B
  '#2563eb', // blue — C
  '#db2777', // pink — D
  '#ca8a04', // gold — E
  '#16a34a', // green — F
] as const;

/** Color tied to the sticky tab letter (A→teal, B→orange, …). */
export function accentColorForTabLetter(letter: string): string {
  const normalized = letter.trim().toUpperCase();
  const index = normalized.charCodeAt(0) - 65;
  if (index < 0 || index > 25) {
    return ORDER_ACCENT_COLORS[0];
  }
  return ORDER_ACCENT_COLORS[index % ORDER_ACCENT_COLORS.length];
}
