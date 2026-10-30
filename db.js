// Piccolo wrapper su IndexedDB per le colture.
const DB = (() => {
  const NOME_DB = 'orto';
  const VERSIONE = 1;
  const STORE = 'colture';
  let dbPromise;

  function apri() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(NOME_DB, VERSIONE);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  async function transazione(modo, fn) {
    const db = await apri();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, modo);
      const store = tx.objectStore(STORE);
      let risultato;
      const req = fn(store);
      if (req) req.onsuccess = () => { risultato = req.result; };
      tx.oncomplete = () => resolve(risultato);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  return {
    tutte: () => transazione('readonly', (s) => s.getAll()),
    salva: (coltura) => transazione('readwrite', (s) => s.put(coltura)),
    elimina: (id) => transazione('readwrite', (s) => s.delete(id)),
    // Sostituisce tutto il contenuto in un'unica transazione (usato dall'import).
    sostituisciTutte: (colture) => transazione('readwrite', (s) => {
      s.clear();
      colture.forEach((c) => s.put(c));
    }),
  };
})();
