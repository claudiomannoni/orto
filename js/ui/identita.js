// Come si presenta un orto: "Orto del pozzo, di Claudio". Nome dell'orto e del coltivatore sono facoltativi.
import { t } from '../i18n.js';

export function etichettaOrto({ nome_orto: orto, nome_coltivatore: coltivatore }) {
  if (orto && coltivatore) return t('identita.completa', { orto, coltivatore });
  if (orto) return orto;
  if (coltivatore) return t('identita.solo_coltivatore', { coltivatore });
  return null;
}
