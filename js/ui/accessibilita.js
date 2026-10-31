// Accessibilità: testo ingrandibile, contrasto alto, meno movimento, lettura ad alta voce.
// Le scelte si salvano nelle impostazioni e si applicano all'apertura dell'app (attributi su <html>, regole in app.css).

export const DIMENSIONI_TESTO = ['normale', 'grande', 'enorme'];

// s = impostazioni: { testo, contrasto, movimento_ridotto }.
export function applicaAccessibilita(s = {}) {
  const radice = document.documentElement;
  const testo = DIMENSIONI_TESTO.includes(s.testo) ? s.testo : 'normale';
  if (testo === 'normale') radice.removeAttribute('data-testo');
  else radice.setAttribute('data-testo', testo);
  if (s.contrasto) radice.setAttribute('data-contrasto', 'alto');
  else radice.removeAttribute('data-contrasto');
  if (s.movimento_ridotto) radice.setAttribute('data-movimento', 'ridotto');
  else radice.removeAttribute('data-movimento');
}
