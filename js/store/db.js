// IndexedDB: database "orto", versione 2. Schema in docs/schema-dati.md.
// La versione 1 aveva solo lo store "colture": passando alla 2 si aggiungono gli altri
// e le colture già salvate restano dove sono.

const NOME_DB = 'orto';
const VERSIONE_DB = 3;
const STORES = {
  colture: 'id',
  impostazioni: 'chiave',
  zone: 'id',
  eventi: 'id',
  foto: 'id', // dalla versione 3: il diario fotografico
};

let promessa = null;

function apri() {
  if (!promessa) {
    promessa = new Promise((ok, ko) => {
      const richiesta = indexedDB.open(NOME_DB, VERSIONE_DB);
      richiesta.onupgradeneeded = () => {
        const db = richiesta.result;
        for (const [nome, chiave] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(nome)) db.createObjectStore(nome, { keyPath: chiave });
        }
      };
      richiesta.onsuccess = () => {
        const db = richiesta.result;
        // Se un'altra scheda aggiorna il database, lascia fare.
        db.onversionchange = () => { db.close(); promessa = null; };
        ok(db);
      };
      richiesta.onerror = () => { promessa = null; ko(richiesta.error); };
      richiesta.onblocked = () => console.warn('Database bloccato da un\'altra scheda aperta');
    });
  }
  return promessa;
}

async function esegui(stores, modo, fn) {
  const db = await apri();
  return new Promise((ok, ko) => {
    const tx = db.transaction(stores, modo);
    const oggetti = Object.fromEntries(stores.map((s) => [s, tx.objectStore(s)]));
    let risultato;
    const richiesta = fn(oggetti);
    if (richiesta && 'onsuccess' in richiesta) richiesta.onsuccess = () => { risultato = richiesta.result; };
    tx.oncomplete = () => ok(risultato);
    tx.onerror = () => ko(tx.error);
    tx.onabort = () => ko(tx.error);
  });
}

export const tutte = (store) => esegui([store], 'readonly', (o) => o[store].getAll());
export const ottieni = (store, id) => esegui([store], 'readonly', (o) => o[store].get(id));
export const salva = (store, record) => esegui([store], 'readwrite', (o) => o[store].put(record));
export const elimina = (store, id) => esegui([store], 'readwrite', (o) => o[store].delete(id));

// Sostituisce il contenuto degli store indicati in un'unica transazione:
// o va tutto bene o non cambia niente. mappa = { colture: [...], eventi: [...] }
export function sostituisci(mappa) {
  const stores = Object.keys(mappa);
  return esegui(stores, 'readwrite', (o) => {
    for (const store of stores) {
      o[store].clear();
      mappa[store].forEach((record) => o[store].put(record));
    }
  });
}
