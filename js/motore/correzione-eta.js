const dataValida = (data) => {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [anno, mese, giorno] = data.split('-').map(Number);
  const d = new Date(Date.UTC(anno, mese - 1, giorno));
  return d.getUTCFullYear() === anno && d.getUTCMonth() === mese - 1 && d.getUTCDate() === giorno;
};

// Calcola lo scarto dell'età stimata in base alla fase osservata nella foto.
export function calcolaCorrezioneEta({ eta, faseOsservata, fasi = [], data } = {}) {
  if (!Number.isInteger(eta) || eta < 0 || eta > 5000 || !dataValida(data)) return null;
  const fase = fasi.find((f) => f.id === faseOsservata);
  if (!fase || !Number.isInteger(fase.da_giorno) || fase.da_giorno < 0 || fase.da_giorno > 5000) return null;
  const giorni = fase.da_giorno - eta;
  if (giorni === 0 || Math.abs(giorni) > 500 || eta + giorni < 0) return null;
  return { giorni, data, fonte: 'foto' };
}

export function normalizzaCorrezioneEta(v) {
  if (!v || !Number.isInteger(v.giorni) || Math.abs(v.giorni) > 500 || !dataValida(v.data) || v.fonte !== 'foto') return null;
  return { giorni: v.giorni, data: v.data, fonte: 'foto' };
}
