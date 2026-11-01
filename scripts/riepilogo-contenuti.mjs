#!/usr/bin/env node
// Strumento a mano: stampa quanto sono completi i contenuti (colture, animali, rendita).
// Uso: node scripts/riepilogo-contenuti.mjs [cartella-app]   (default: .)
import fs from "node:fs";
import path from "node:path";

const cartella = process.argv[2] ?? ".";
const dirDati = path.join(cartella, "data", "it");

const siNo = (v) => (v ? "sì" : "no");

// Conta tutte le chiavi "certezza" per valore, ricorsivamente in tutta la scheda.
function contaCertezze(obj, conteggi = {}) {
  if (obj === null || typeof obj !== "object") return conteggi;
  if (Array.isArray(obj)) {
    for (const item of obj) contaCertezze(item, conteggi);
    return conteggi;
  }
  for (const [chiave, valore] of Object.entries(obj)) {
    if (chiave === "certezza" && typeof valore === "string") {
      conteggi[valore] = (conteggi[valore] ?? 0) + 1;
    }
    contaCertezze(valore, conteggi);
  }
  return conteggi;
}

// Numero di fonti: nelle colture è un oggetto con id come chiavi, altrove un array.
function numFonti(fonti) {
  if (Array.isArray(fonti)) return fonti.length;
  if (fonti && typeof fonti === "object") return Object.keys(fonti).length;
  return 0;
}

// Mesi (1-12) coperti dai "mesi" dei lavori del calendario.
function mesiCopertiLavori(lavori) {
  const mesi = new Set();
  for (const lavoro of Array.isArray(lavori) ? lavori : []) {
    for (const m of Array.isArray(lavoro?.mesi) ? lavoro.mesi : []) mesi.add(m);
  }
  return mesi.size;
}

// Calendario mese per mese (animali/rendita): conta i mesi con almeno una voce.
function mesiConVoci(calendario) {
  if (!calendario || typeof calendario !== "object") return 0;
  return Object.values(calendario).filter((v) => Array.isArray(v) && v.length > 0).length;
}

// Stampa una tabella di testo con colonne allineate.
function stampaTabella(intestazione, colonne, righe) {
  console.log(intestazione);
  const larghezze = colonne.map((c, i) =>
    Math.max(c.length, ...righe.map((r) => String(r[i]).length))
  );
  const riga = (celle) =>
    celle
      .map((cella, i) => String(cella).padEnd(larghezze[i]))
      .join("  ")
      .trimEnd();
  console.log(riga(colonne));
  console.log(larghezze.map((l) => "-".repeat(l)).join("  "));
  for (const r of righe) console.log(riga(r));
  console.log("");
}

// --- 1. Colture ---
const dirColture = path.join(dirDati, "colture");
const fileColture = fs
  .readdirSync(dirColture)
  .filter((f) => f.endsWith(".json") && f !== "indice.json")
  .sort();

const righeColture = [];
const tot = { semina: 0, giorni: 0, consociazioni: 0 };
const punteggi = [];

for (const file of fileColture) {
  const scheda = JSON.parse(fs.readFileSync(path.join(dirColture, file), "utf8"));
  const s = scheda.semina ?? {};
  const seminaCompleta = [s.profondita_cm, s.distanza_file_cm, s.distanza_piante_cm].every(
    (v) => v !== null && v !== undefined
  );
  const g = scheda.giorni_alla_raccolta;
  const giorniOk =
    !!g && typeof g === "object" && typeof g.min === "number" && typeof g.max === "number";
  const c = scheda.consociazioni ?? {};
  const consociazioniOk =
    (Array.isArray(c.amiche) && c.amiche.length > 0) ||
    (Array.isArray(c.nemiche) && c.nemiche.length > 0);
  const mesi = mesiCopertiLavori(scheda.calendario?.["castelli-romani"]);
  const fonti = numFonti(scheda.fonti);
  const cert = contaCertezze(scheda);

  tot.semina += seminaCompleta ? 1 : 0;
  tot.giorni += giorniOk ? 1 : 0;
  tot.consociazioni += consociazioniOk ? 1 : 0;
  punteggi.push({
    id: scheda.id ?? file,
    somma: (seminaCompleta ? 1 : 0) + (giorniOk ? 1 : 0) + (consociazioniOk ? 1 : 0),
    mesi,
  });

  righeColture.push([
    scheda.id ?? file,
    siNo(seminaCompleta),
    siNo(giorniOk),
    siNo(consociazioniOk),
    `${mesi}/12`,
    fonti,
    cert.bassa ?? 0,
  ]);
}

stampaTabella(
  "COLTURE (data/it/colture)",
  ["id", "semina", "giorni", "consoc", "mesi", "fonti", "cert.bassa"],
  righeColture
);

// --- 2. Animali e rendita ---
for (const file of ["animali.json", "rendita.json"]) {
  const dati = JSON.parse(fs.readFileSync(path.join(dirDati, file), "utf8"));
  const righe = [];
  for (const scheda of dati.schede ?? []) {
    const calendario = scheda.calendario ?? scheda.quando ?? {};
    const mesi = mesiConVoci(calendario);
    const cert = contaCertezze(scheda);
    righe.push([
      scheda.id,
      `${mesi}/12`,
      numFonti(scheda.fonti),
      cert.alta ?? 0,
      cert.media ?? 0,
      cert.bassa ?? 0,
    ]);
  }
  stampaTabella(
    file === "animali.json" ? "ANIMALI (data/it/animali.json)" : "RENDITA (data/it/rendita.json)",
    ["id", "mesi", "fonti", "alta", "media", "bassa"],
    righe
  );
}

// --- 3. Riepilogo ---
const n = fileColture.length;
console.log("RIEPILOGO COLTURE");
console.log(`Semina completa: ${tot.semina}/${n}`);
console.log(`Giorni alla raccolta: ${tot.giorni}/${n}`);
console.log(`Consociazioni: ${tot.consociazioni}/${n}`);
const peggiori = [...punteggi]
  .sort((a, b) => a.somma - b.somma || a.mesi - b.mesi)
  .slice(0, 5);
console.log(
  "5 colture con meno dati: " +
    peggiori.map((p) => `${p.id} (${p.somma}/3, ${p.mesi} mesi)`).join(", ")
);
