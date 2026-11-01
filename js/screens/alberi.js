// «Alberi da frutto»: olivo, vite, fico, melo, pero, pesco, ciliegio, albicocco, susino, nocciolo. Stesso schermo delle colture speciali, altri dati (data/it/alberi.json).
import { creaSchermata } from './rendita.js';
import { alberi } from '../contenuti.js';

export const monta = creaSchermata({ carica: alberi, base: '#/alberi', titolo: 'alberi.titolo', spiega: 'alberi.spiega', nonDisponibile: 'alberi.non_disponibile' });
