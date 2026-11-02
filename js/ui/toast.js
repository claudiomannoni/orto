// Messaggio breve in basso, sopra la barra di navigazione.
let timer;

export function toast(messaggio, azione = null) {
  const e = document.getElementById('toast');
  if (!e) return;
  e.replaceChildren(document.createTextNode(messaggio));
  if (azione?.testo && azione?.esegui) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'toast-azione'; b.textContent = azione.testo;
    b.addEventListener('click', () => { azione.esegui(); e.classList.remove('visibile'); });
    e.append(' ', b);
  }
  e.classList.add('visibile');
  clearTimeout(timer);
  timer = setTimeout(() => e.classList.remove('visibile'), 3000);
}
