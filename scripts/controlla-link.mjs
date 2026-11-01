#!/usr/bin/env node
// scripts/controlla-link.mjs
// Controlla che gli indirizzi web usati come FONTI nei contenuti rispondano davvero
// Licenza: progetto Orto AI, modulo ES, Node 20+

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// --- Determina la cartella dell'app (argomento opzionale, default '.') ---
const appDir = process.argv[2] ? resolve(process.argv[2]) : resolve('.');
const dataDir = join(appDir, 'data', 'it');

// --- Raccoglie ricorsivamente tutti i file .json sotto una directory ---
function raccogliFileJson(dir) {
  const file = [];
  function walk(d) {
    let voci;
    try {
      voci = readdirSync(d, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const v of voci) {
      const p = join(d, v.name);
      if (v.isDirectory()) walk(p);
      else if (v.name.endsWith('.json')) file.push(p);
    }
  }
  walk(dir);
  return file;
}

// --- Estrae tutti gli URL https:// o http:// da un valore JSON (anche annidati) ---
function estraiURL(val) {
  const set = new Set();
  function traverse(o) {
    if (o && typeof o === 'object') {
      if (Array.isArray(o)) {
        for (const i of o) traverse(i);
      } else {
        for (const k of Object.keys(o)) traverse(o[k]);
      }
    } else if (typeof o === 'string') {
      if (o.startsWith('https://') || o.startsWith('http://')) set.add(o);
    }
  }
  traverse(val);
  return set;
}

// --- Raccoglie URL unici e mappa file in cui compaiano ---
const fileJson = raccogliFileJson(dataDir);
const urlMap = new Map(); // url -> Set<path_file>

for (const f of fileJson) {
  try {
    const dati = JSON.parse(readFileSync(f, 'utf8'));
    for (const u of estraiURL(dati)) {
      if (!urlMap.has(u)) urlMap.set(u, new Set());
      urlMap.get(u).add(f);
    }
  } catch (e) {
    // Ignora file JSON non validi
  }
}

// --- Lista degli URL unici da controllare ---
const urlList = [...urlMap.keys()];
let okCount = 0;
let attenzioneCount = 0;
let rottoCount = 0;

// --- Controlla un URL: HEAD prima, poi GET se 403/405/501 ---
async function controllaURL(url) {
  const files = urlMap.get(url);

  try {
    // Richiesta HEAD con timeout 10s
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 10000);

    let resp;
    try {
      resp = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: ac.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OrtoAI-controllo-link)' }
      });
    } finally {
      clearTimeout(tid);
    }

    // Se risponde 403, 405 o 501, riprova con GET
    if (resp.status === 403 || resp.status === 405 || resp.status === 501) {
      try {
        const gac = new AbortController();
        const gtid = setTimeout(() => gac.abort(), 10000);

        let gre;
        try {
          gre = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: gac.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OrtoAI-controllo-link)' }
          });
        } finally {
          clearTimeout(gtid);
        }
        resp = gre;
      } catch (ge) {
        // GET fallito -> link rotto
        const lines = [`ROTTO ${ge.message || 'ERRORE'} ${url}`];
        for (const f of [...files].sort()) lines.push(`  ${f}`);
        console.log(lines.join('\n'));
        return 'ROTTO';
      }
    }

    const code = resp.status;

    if (code === 200) {
      const lines = [`OK 200 ${url}`];
      for (const f of [...files].sort()) lines.push(`  ${f}`);
      console.log(lines.join('\n'));
      return 'OK';
    } else if (code === 401 || code === 403 || code === 429) {
      const lines = [`ATTENZIONE ${code} ${url}`];
      for (const f of [...files].sort()) lines.push(`  ${f}`);
      console.log(lines.join('\n'));
      return 'ATTENZIONE';
    } else if (code === 404 || code === 410) {
      const lines = [`ROTTO ${code} ${url}`];
      for (const f of [...files].sort()) lines.push(`  ${f}`);
      console.log(lines.join('\n'));
      return 'ROTTO';
    } else if (code >= 500 && code < 600) {
      const lines = [`ROTTO ${code} ${url}`];
      for (const f of [...files].sort()) lines.push(`  ${f}`);
      console.log(lines.join('\n'));
      return 'ROTTO';
    } else {
      // Altri codici di stato considerati problemi
      const lines = [`ROTTO ${code} ${url}`];
      for (const f of [...files].sort()) lines.push(`  ${f}`);
      console.log(lines.join('\n'));
      return 'ROTTO';
    }

  } catch (err) {
    // Errore di rete, timeout, o fetch fallito
    const lines = [`ROTTO ${err.message || 'ERRORE'} ${url}`];
    for (const f of [...files].sort()) lines.push(`  ${f}`);
    console.log(lines.join('\n'));
    return 'ROTTO';
  }
}

// --- Processa tutti gli URL a gruppi di 5 (massimo concorrenti) ---
for (let i = 0; i < urlList.length; i += 5) {
  const batch = urlList.slice(i, i + 5);
  const results = await Promise.all(batch.map(controllaURL));
  for (const r of results) {
    if (r === 'OK') okCount++;
    else if (r === 'ATTENZIONE') attenzioneCount++;
    else if (r === 'ROTTO') rottoCount++;
  }
}

// --- Riepilogo finale ---
console.log(`\nRiepilogo: ${okCount} OK, ${attenzioneCount} ATTENZIONE, ${rottCount} ROTTI`);
process.exit(rottCount > 0 ? 1 : 0);