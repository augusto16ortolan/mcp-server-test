import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
import { normalizarGeneros } from './lib/generos.mjs';
import { claims, values, qualifier, label, dataWikidata, duracaoWikidata, avaliacaoWikidata, imagemCommons } from './lib/wikidata.mjs';

const root = new URL('../', import.meta.url);
const cache = new URL('.cache/wikidata/', root);
await mkdir(cache, { recursive: true });
const refresh = process.argv.includes('--atualizar');
const userAgent = 'CineCatalogoEducacional/2.0 (https://github.com/augusto16ortolan/mcp-server-test)';
async function api(base, params) {
  const url = new URL(base);
  url.search = new URLSearchParams({ format: 'json', ...params });
  const path = new URL(`${createHash('sha256').update(url.href).digest('hex')}.json`, cache);
  if (!refresh) { try { return JSON.parse(await readFile(path, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    await pause(400 + tentativa * 2000);
    const r = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' }, signal: AbortSignal.timeout(45000) });
    if (r.status === 429 || r.status >= 500) { await pause(Math.min(30000, Number(r.headers.get('retry-after') || 2) * 1000)); continue; }
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${url.origin}`);
    const data = await r.json();
    if (data.error?.code === 'maxlag') continue;
    if (data.error) throw new Error(JSON.stringify(data.error));
    const envelope = { consultado_em: new Date().toISOString(), data };
    await writeFile(path, JSON.stringify(envelope));
    return envelope;
  }
  throw new Error(`Consulta indisponível após tentativas: ${url.origin}`);
}
const wd = params => api('https://www.wikidata.org/w/api.php', { action: 'wbgetentities', languages: 'pt-br|pt|en|mul', maxlag: '60', ...params });
const selecao = JSON.parse(await readFile(new URL('dados/selecao-reais.json', root)));
if (selecao.length !== 100) throw new Error('A seleção precisa conter exatamente 100 filmes.');
const entidades = new Map();
const porTitulo = new Map();
for (let i = 0; i < selecao.length; i += 25) {
  const lote = selecao.slice(i, i + 25);
  const consulta = lote.every(s => s.wikidata_id) ? { ids: lote.map(s => s.wikidata_id).join('|') } : { sites: 'enwiki', titles: lote.map(s => s.titulo_enwiki).join('|') };
  const resposta = await wd({ ...consulta, props: 'labels|aliases|descriptions|claims|sitelinks|info' });
  for (const e of Object.values(resposta.data.entities)) {
    if ('missing' in e) continue;
    e.consultado_em = resposta.consultado_em;
    entidades.set(e.id, e);
    porTitulo.set(lote.find(s => s.wikidata_id === e.id)?.titulo_enwiki || e.sitelinks?.enwiki?.title, e);
  }
  console.log(`Filmes consultados: ${Math.min(i + 25, 100)}/100`);
}
const ausentes = selecao.filter(s => !porTitulo.has(s.titulo_enwiki));
if (ausentes.length) throw new Error(`Corrija títulos da seleção: ${ausentes.map(s => s.titulo_enwiki).join('; ')}`);
const ids = new Set();
for (const e of porTitulo.values()) {
  for (const p of ['P57', 'P161', 'P725', 'P136', 'P495', 'P364']) for (const v of values(e, p)) if (v.id) ids.add(v.id);
  for (const c of [...claims(e, 'P161'), ...claims(e, 'P725')]) for (const v of qualifier(c, 'P453')) if (v.id) ids.add(v.id);
}
const relacionados = [...ids];
for (let i = 0; i < relacionados.length; i += 50) {
  const r = await wd({ ids: relacionados.slice(i, i + 50).join('|'), props: 'labels|descriptions' });
  for (const e of Object.values(r.data.entities)) entidades.set(e.id, e);
  console.log(`Pessoas, países e gêneros: ${Math.min(i + 50, relacionados.length)}/${relacionados.length}`);
}
// P3383 é pôster. P18 é imagem relacionada: não rotula foto do elenco como pôster.
const arquivos = [...new Set([...porTitulo.values()].flatMap(e => [values(e, 'P3383')[0], values(e, 'P18')[0]]).filter(x => typeof x === 'string'))];
const imagens = new Map();
for (let i = 0; i < arquivos.length; i += 20) {
  const r = await api('https://commons.wikimedia.org/w/api.php', { action: 'query', titles: arquivos.slice(i, i + 20).map(a => `File:${a}`).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '500', redirects: '1' });
  const pages = new Map(Object.values(r.data.query.pages).map(p => [p.title, p.imageinfo?.[0]]));
  const redirects = new Map([...(r.data.query.normalized || []), ...(r.data.query.redirects || [])].map(n => [n.from, n.to]));
  for (const nome of arquivos.slice(i, i + 20)) {
    let chave = `File:${nome}`;
    for (let n = 0; n < 5 && redirects.has(chave); n++) chave = redirects.get(chave);
    imagens.set(nome, pages.get(chave));
  }
  console.log(`Metadados de imagens: ${Math.min(i + 20, arquivos.length)}/${arquivos.length}`);
}
const nome = id => label(entidades.get(id));
const nomes = (e, p) => [...new Set(values(e, p).map(v => nome(v.id)).filter(Boolean))];
const filmes = selecao.map(s => {
  const e = porTitulo.get(s.titulo_enwiki);
  if (s.imdb_id && !values(e, 'P345').includes(s.imdb_id)) throw new Error(`Identidade IMDb mudou: ${s.titulo_enwiki}`);
  if (!values(e, 'P345').some(v => /^tt\d+$/.test(v)) || !values(e, 'P57').length) throw new Error(`Não parece ser ficha de filme: ${s.titulo_enwiki}`);
  const lancamentos = values(e, 'P577').map(dataWikidata).filter(Boolean).sort();
  const aliases = [...(e.aliases?.['pt-br'] || []), ...(e.aliases?.pt || [])].map(a => a.value);
  const titulo = e.labels?.['pt-br']?.value || e.labels?.pt?.value || aliases[0] || label(e) || s.titulo_enwiki;
  const duracao = duracaoWikidata(e);
  const diretores = nomes(e, 'P57');
  const paises = nomes(e, 'P495');
  const idiomas = nomes(e, 'P364');
  const generosOriginais = nomes(e, 'P136');
  const generos = normalizarGeneros(e, generosOriginais);
  const poster = imagemCommons(imagens.get(values(e, 'P3383')[0]), 'poster');
  const imagem = poster || imagemCommons(imagens.get(values(e, 'P18')[0]), 'imagem_relacionada');
  const descricao = e.descriptions?.['pt-br']?.value || e.descriptions?.pt?.value || null;
  return {
    id: `REAL-${e.id}`, tipo: 'real', titulo, titulos_alternativos: [...new Set([label(e), ...aliases].filter(Boolean))], titulo_original: values(e, 'P1476')[0]?.text || e.labels?.en?.value || e.labels?.mul?.value || titulo,
    ano: lancamentos.length ? Number(lancamentos[0].slice(0, 4)) : null,
    generos, generos_originais: generosOriginais, duracao_minutos: duracao?.minutos ?? null,
    idade_minima_sugerida: null, climas: [], sinopse: null, descricao,
    disponivel: true, disponibilidade_observacao: 'Incluído no catálogo local para planejamento; não informa streaming, ingresso ou licença de exibição.',
    diretor: diretores.join(', ') || null, diretores, pais: paises[0] || null, paises,
    idioma_original: idiomas[0] || null, idiomas_originais: idiomas,
    audios: [], legendas: [], temas: [], avisos_conteudo: null, colecao: null,
    elenco: [...claims(e, 'P161').map(c => ({...c,interpretacao:'atuação'})), ...claims(e, 'P725').map(c => ({...c,interpretacao:'voz'}))].map(c => ({ interpretacao: c.interpretacao, nome: nome(c.mainsnak.datavalue.value.id), wikidata_id: c.mainsnak.datavalue.value.id,
      personagens: qualifier(c, 'P453').map(v => nome(v.id)).filter(Boolean) })).filter(a => a.nome).slice(0, 20),
    avaliacao: avaliacaoWikidata(e), poster_url: poster?.url || null, imagem,
    identificadores: { wikidata: e.id, imdb: values(e, 'P345')[0] || null, tmdb: values(e, 'P4947')[0] || null },
    fonte: { nome: 'Wikidata', url: `https://www.wikidata.org/wiki/${e.id}`, revisao: e.lastrevid,
      consultado_em: e.consultado_em, licenca_dados: 'CC0-1.0',
      propriedades: { diretores: 'P57', elenco: 'P161', vozes: 'P725', tipo_obra: 'P31', duracao: 'P2047', ano: 'P577', generos: 'P136', paises: 'P495', idiomas: 'P364', avaliacao: 'P444', poster: 'P3383', imagem_relacionada: 'P18' },
      declaracao_duracao: duracao?.declaracao || null },
    observacoes: ['Elenco limitado aos primeiros 20 créditos de atuação/voz informados pelo Wikidata; não é necessariamente ordem de protagonismo nem garantia de áudio disponível em algum idioma.',
      'Ano corresponde à primeira data de lançamento informada. Duração usa a primeira declaração preferida, ou a primeira válida em minutos; versões podem diferir.',
      'Notas são registros históricos do Wikidata, não uma consulta atual ao IMDb. Campos ausentes permanecem nulos ou sem valores.']
  };
});
if (new Set(filmes.map(f => f.id)).size !== 100) throw new Error('Seleção contém filmes repetidos.');
const arquivo = new URL('dados/filmes-reais.json', root);
// Valida antes de trocar o arquivo consumido pelo servidor.
const { validarCatalogo } = await import('../src/catalogo.mjs');
validarCatalogo(filmes);
await writeFile(new URL('dados/filmes-reais.json.tmp', root), JSON.stringify(filmes, null, 2) + '\n');
await rename(new URL('dados/filmes-reais.json.tmp', root), arquivo);
console.log(JSON.stringify({ filmes: filmes.length, com_duracao: filmes.filter(f => f.duracao_minutos !== null).length,
  com_avaliacao: filmes.filter(f => f.avaliacao).length, com_imagem: filmes.filter(f => f.imagem).length, com_poster: filmes.filter(f => f.poster_url).length }, null, 2));
