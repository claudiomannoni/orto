// Foto dal telefono: si riducono prima di usarle (meno dati da inviare, meno spazio occupato, meno quota consumata).

const LATO_MASSIMO = 1024;
const QUALITA = 0.72;
const LATO_MINIATURA = 240;

function errore(codice) {
  return Object.assign(new Error(codice), { codice });
}

const comeBase64 = (blob) => new Promise((ok, ko) => {
  const lettore = new FileReader();
  lettore.onload = () => ok(String(lettore.result).split(',')[1]);
  lettore.onerror = () => ko(errore('lettura'));
  lettore.readAsDataURL(blob);
});

const comeDataUrl = (blob) => new Promise((ok, ko) => {
  const lettore = new FileReader();
  lettore.onload = () => ok(String(lettore.result));
  lettore.onerror = () => ko(errore('lettura'));
  lettore.readAsDataURL(blob);
});

async function disegna(immagine, lato, qualita) {
  const scala = Math.min(1, lato / Math.max(immagine.width, immagine.height));
  const larghezza = Math.max(1, Math.round(immagine.width * scala));
  const altezza = Math.max(1, Math.round(immagine.height * scala));
  const tela = document.createElement('canvas');
  tela.width = larghezza;
  tela.height = altezza;
  tela.getContext('2d').drawImage(immagine, 0, 0, larghezza, altezza);
  const blob = await new Promise((ok) => tela.toBlob(ok, 'image/jpeg', qualita));
  if (!blob) throw errore('lettura');
  return { blob, larghezza, altezza };
}

// file: un File scelto o scattato. Restituisce { tipo, base64, anteprima, byte, blob, larghezza, altezza }
// (JPEG, lato lungo al massimo 1024 px). Con miniatura: true aggiunge anche `miniatura` (data URL, lato lungo 240 px).
export async function riduciFoto(file, { miniatura = false } = {}) {
  if (!file || !/^image\//.test(file.type || '')) throw errore('formato');
  let immagine;
  try {
    immagine = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw errore('lettura'); // formato che il browser non sa aprire (per esempio HEIC)
  }
  try {
    const { blob, larghezza, altezza } = await disegna(immagine, LATO_MASSIMO, QUALITA);
    const risultato = { tipo: 'image/jpeg', base64: await comeBase64(blob), anteprima: URL.createObjectURL(blob), byte: blob.size, blob, larghezza, altezza };
    if (miniatura) risultato.miniatura = await comeDataUrl((await disegna(immagine, LATO_MINIATURA, 0.7)).blob);
    return risultato;
  } finally {
    immagine.close?.();
  }
}

// Da un Blob JPEG a base64 (per mandarlo a Gemini).
export const blobInBase64 = comeBase64;
export const blobInDataUrl = comeDataUrl;

// Da un data URL (per esempio da un backup) a Blob.
export function dataUrlInBlob(dataUrl) {
  const m = /^data:([\w/+.-]+);base64,(.*)$/s.exec(String(dataUrl));
  if (!m) return null;
  const bin = atob(m[2]);
  const byte = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) byte[i] = bin.charCodeAt(i);
  return new Blob([byte], { type: m[1] });
}
