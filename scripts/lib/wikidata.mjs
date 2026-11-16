// Conversão explícita de propriedades Wikidata. Nenhum dado ausente é inventado.
export const claims = (e, p) => (e.claims?.[p] || []).filter(c => c.rank !== 'deprecated' && c.mainsnak?.snaktype === 'value');
export const values = (e, p) => claims(e, p).map(c => c.mainsnak.datavalue?.value).filter(v => v !== undefined);
export const qualifier = (c, p) => (c.qualifiers?.[p] || []).map(s => s.datavalue?.value).filter(v => v !== undefined);
export const label = e => e?.labels?.['pt-br']?.value || e?.labels?.pt?.value || e?.labels?.en?.value || e?.labels?.mul?.value || null;
export function dataWikidata(v) {
  if (!v?.time || v.precision < 9) return null;
  const raw = v.time.replace(/^\+/, '').split('T')[0];
  return raw.slice(0, v.precision >= 11 ? 10 : v.precision === 10 ? 7 : 4);
}
export function duracaoWikidata(e) {
  const entradas = claims(e, 'P2047');
  const preferidas = entradas.filter(c => c.rank === 'preferred');
  const base = [...preferidas, ...entradas.filter(c => c.rank !== 'preferred')];
  for (const c of base) {
    const v = c.mainsnak.datavalue.value;
    // Q7727 = minuto. Não converte uma quantidade cuja unidade não reconhecemos.
    if (v.unit?.endsWith('/Q7727') && Number(v.amount) > 0 && Number(v.amount) <= 600) {
      return { minutos: Number(v.amount), declaracao: c.id };
    }
  }
  return null;
}
export function avaliacaoWikidata(e) {
  // Apenas IMDb /10: não mistura aprovação do Rotten Tomatoes com média de votos.
  const candidatas = claims(e, 'P444').filter(c => qualifier(c, 'P447').some(x => x.id === 'Q37312'))
    .map(c => {
      const match = String(c.mainsnak.datavalue.value).match(/^(\d+(?:[.,]\d+)?)\s*\/\s*10$/);
      if (!match) return null;
      const nota = Number(match[1].replace(',', '.'));
      if (nota < 0 || nota > 10) return null;
      const votos = Number(qualifier(c, 'P7887')[0]?.amount);
      return { fonte: 'IMDb via Wikidata', nota, escala: 10,
        votos: Number.isSafeInteger(votos) && votos >= 0 ? votos : null,
        data_avaliacao: dataWikidata(qualifier(c, 'P585')[0]),
        url: `https://www.wikidata.org/wiki/${e.id}#P444`, declaracao: c.id };
    }).filter(Boolean);
  candidatas.sort((a, b) => (b.data_avaliacao || '').localeCompare(a.data_avaliacao || ''));
  return candidatas[0] || null;
}
export function textoSimples(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
export function imagemCommons(info, tipo) {
  if (!info || !/^https:\/\/upload\.wikimedia\.org\//.test(info.url || '')) return null;
  const meta = info.extmetadata || {};
  const licenca = textoSimples(meta.LicenseShortName?.value);
  // Só publica imagens para as quais o Commons informa uma licença explícita.
  if (!licenca || !/^(CC|Public domain|PD|Attribution)/i.test(licenca)) return null;
  const https = u => u?.startsWith('//') ? `https:${u}` : u?.replace(/^http:/, 'https:');
  const endereco = https(info.thumburl || info.url);
  if (!/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(endereco || '')) return null;
  return { tipo, url: endereco, pagina: https(info.descriptionurl),
    licenca, licenca_url: https(meta.LicenseUrl?.value) || null,
    autor: textoSimples(meta.Artist?.value) || 'Ver página do arquivo',
    credito: textoSimples(meta.Credit?.value) || null };
}
