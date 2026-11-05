// Bustina compatta e riusabile per una coltura registrata.
import { el } from '../util.js';
import { t } from '../i18n.js';

export function bustinaPianta({ coltura, scheda, stato = 'ignoto', fase = null, eta = null, href = null, ciclo = null, prossima = null, raccolto = null, nota = null }) {
  const nome = coltura.varieta ? `${coltura.nome} · ${coltura.varieta}` : coltura.nome;
  const durata = Number.isFinite(ciclo) && ciclo > 0 ? ciclo : null;
  const progresso = durata && Number.isFinite(eta) ? Math.max(0, Math.min(100, eta / durata * 100)) : 100;
  const colore = ({ urgente: 'var(--pomodoro)', attenzione: 'var(--zucca)', ok: 'var(--verde-vivo)' })[stato] ?? 'var(--inchiostro-2)';
  const anello = el('span', { class: 'anello', style: `--c:${colore};--p:${durata ? progresso : 100}`, 'aria-label': durata ? t('colture.progresso', { n: Math.round(progresso) }) : t('colture.progresso_sconosciuto') },
    el('img', { src: scheda?.icona ?? 'assets/colture/generica.svg', alt: '', width: 36, height: 36, loading: 'lazy' }));
  const contenuto = el('span', { class: 'bustina-pianta-contenuto' },
    anello,
    el('strong', { class: 'bustina-pianta-nome' }, nome),
    el('span', { class: 'bustina-pianta-meta' }, [fase, eta === null ? null : t('colture.eta', { n: eta })].filter(Boolean).join(' · ') || t('colture.fase_sconosciuta')),
    prossima ? el('span', { class: 'bustina-pianta-dettaglio' }, prossima) : null,
    raccolto ? el('span', { class: 'bustina-pianta-dettaglio' }, raccolto) : null,
    nota ? el('span', { class: 'bustina-pianta-meta' }, nota) : null,
  );
  return el(href ? 'a' : 'article', { class: `bustina-pianta ${href ? '' : 'bustina-pianta-ampia'} stato-${stato}`, ...(href ? { href } : {}), 'aria-label': `${nome}: ${t(`salute.${stato}`)}` },
    el('span', { class: 'bustina-pianta-fascia', 'aria-hidden': 'true' }), contenuto,
  );
}
