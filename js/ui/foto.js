// Foto dal telefono: si riducono prima di usarle (meno dati da inviare, meno quota consumata).

const LATO_MASSIMO = 1024;
const QUALITA = 0.72;

function errore(codice) {
  return Object.assign(new Error(codice), { codice });
}

const comeBase64 = (blob) => new Promise((ok, ko) => {
  const lettore = new FileReader();
  lettore.onload = () => ok(String(lettore.result).split(',')[1]);
  lettore.onerror = () => ko(errore('lettura'));
  lettore.readAsDataURL(blob);
});

// file: un File scelto o scattato. Restituisce { tipo, base64, anteprima, byte } (JPEG, lato lungo al massimo 1024 px).
export async function riduciFoto(file) {
  if (!file || !/^image\//.test(file.type || '')) throw errore('formato');
  let immagine;
  try {
    immagine = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw errore('lettura'); // formato che il browser non sa aprire (per esempio HEIC)
  }
  const scala = Math.min(1, LATO_MASSIMO / Math.max(immagine.width, immagine.height));
  const larghezza = Math.max(1, Math.round(immagine.width * scala));
  const altezza = Math.max(1, Math.round(immagine.height * scala));
  const tela = document.createElement('canvas');
  tela.width = larghezza;
  tela.height = altezza;
  tela.getContext('2d').drawImage(immagine, 0, 0, larghezza, altezza);
  immagine.close?.();
  const blob = await new Promise((ok) => tela.toBlob(ok, 'image/jpeg', QUALITA));
  if (!blob) throw errore('lettura');
  return { tipo: 'image/jpeg', base64: await comeBase64(blob), anteprima: URL.createObjectURL(blob), byte: blob.size, larghezza, altezza };
}
