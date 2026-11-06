// Interpreta uno swipe orizzontale senza dipendere dal DOM.
export const SOGLIA_GESTO = 72;
export function interpretaGesto(dx, dy, soglia = SOGLIA_GESTO) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) < soglia || Math.abs(dx) <= Math.abs(dy)) return null;
  return dx > 0 ? 'innaffiato' : 'raccolto';
}
