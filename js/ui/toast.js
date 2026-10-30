// Messaggio breve in basso, sopra la barra di navigazione.
let timer;

export function toast(messaggio) {
  const e = document.getElementById('toast');
  if (!e) return;
  e.textContent = messaggio;
  e.classList.add('visibile');
  clearTimeout(timer);
  timer = setTimeout(() => e.classList.remove('visibile'), 3000);
}
