import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { GENEROS, CLIMAS, TEMAS, CONTEUDOS, filmeSchema, buscaSchema, detalheSchema, compararSchema, sessaoSchema, resumoSchema, alternativasSchema } from './schemas.mjs';
export { GENEROS, CLIMAS, buscaSchema, detalheSchema } from './schemas.mjs';
export const AVISO = 'Catálogo fictício para ensino. Todas as fichas, pessoas, coleções, disponibilidade, idiomas e indicações etárias são dados didáticos; não representam classificação oficial ou streaming real.';
export const normalizar = texto => texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
const contem = (valor, termo) => !termo || normalizar(valor).includes(normalizar(termo));
const igual = (valor, termo) => !termo || normalizar(valor) === normalizar(termo);
const grupo = (valores, pedidos, modo) => !pedidos || (modo === 'todos' ? pedidos.every(x => valores.includes(x)) : pedidos.some(x => valores.includes(x)));
const tituloAsc = (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR') || a.id.localeCompare(b.id);
const resumo = ({ sinopse, ...f }) => f;
const envelope = dados => ({ aviso: AVISO, ...dados });

export function validarCatalogo(dados) {
  const filmes = z.array(filmeSchema).min(1).parse(dados);
  if (new Set(filmes.map(f => f.id)).size !== filmes.length) throw new Error('O catálogo contém IDs duplicados.');
  const posicoes = filmes.filter(f => f.colecao).map(f => `${f.colecao.nome}:${f.colecao.ordem}`);
  if (new Set(posicoes).size !== posicoes.length) throw new Error('Ordem repetida dentro de uma coleção.');
  for (const f of filmes) {
    for (const v of Object.values(f)) if (v && typeof v === 'object') Object.freeze(v);
    Object.freeze(f);
  }
  return Object.freeze(filmes);
}
export function carregarCatalogo(arquivo = new URL('../dados/filmes.json', import.meta.url)) {
  return validarCatalogo(JSON.parse(readFileSync(arquivo, 'utf8')));
}
export function corresponde(f, p) {
  return contem(f.titulo, p.titulo) && contem(f.diretor, p.diretor) && igual(f.pais, p.pais) && igual(f.idioma_original, p.idioma_original) &&
    (!p.audio || f.audios.some(a => igual(a, p.audio))) && (!p.legenda || f.legendas.some(a => igual(a, p.legenda))) &&
    (!p.colecao || (f.colecao !== null && contem(f.colecao.nome, p.colecao))) &&
    (!p.genero || f.generos.includes(p.genero)) && grupo(f.generos, p.generos, p.modo_generos) &&
    !(p.excluir_generos || []).some(g => f.generos.includes(g)) &&
    (!p.clima || f.climas.includes(p.clima)) && grupo(f.climas, p.climas, p.modo_climas) &&
    grupo(f.temas, p.temas, p.modo_temas) && !(p.excluir_conteudos || []).some(c => f.avisos_conteudo.includes(c)) &&
    (p.duracao_minima === undefined || f.duracao_minutos >= p.duracao_minima) &&
    (p.duracao_maxima === undefined || f.duracao_minutos <= p.duracao_maxima) &&
    (p.ano === undefined || f.ano === p.ano) &&
    (p.ano_minimo === undefined || f.ano >= p.ano_minimo) && (p.ano_maximo === undefined || f.ano <= p.ano_maximo) &&
    (p.idade_publico === undefined || f.idade_minima_sugerida <= p.idade_publico) && (!p.somente_disponiveis || f.disponivel);
}
export function criarConsultas(filmes) {
  const ordenados = [...filmes].sort(tituloAsc);
  const selecionar = p => ordenados.filter(f => corresponde(f, p));
  const valores = campo => [...new Set(filmes.flatMap(f => f[campo]))].sort((a,b) => a.localeCompare(b,'pt-BR'));
  return {
    listarFiltros() {
      return envelope({ generos: GENEROS, climas: CLIMAS, temas: TEMAS, avisos_conteudo: CONTEUDOS,
        paises: valores('pais'), diretores: valores('diretor'), idiomas_originais: valores('idioma_original'),
        audios: valores('audios'), legendas: valores('legendas'),
        colecoes: [...new Set(filmes.flatMap(f => f.colecao ? [f.colecao.nome] : []))],
        modos: ['qualquer', 'todos'], ordenar_por: ['titulo', 'duracao', 'ano'], ordens: ['asc', 'desc'],
        idades_sugeridas: [0,10,12,14,16,18], total: filmes.length, disponiveis: filmes.filter(f => f.disponivel).length,
        duracao_minima: Math.min(...filmes.map(f => f.duracao_minutos)), duracao_maxima: Math.max(...filmes.map(f => f.duracao_minutos)),
        ano_minimo: Math.min(...filmes.map(f => f.ano)), ano_maximo: Math.max(...filmes.map(f => f.ano)) });
    },
    buscar(entrada = {}) {
      const p = buscaSchema.parse(entrada);
      const encontrados = selecionar(p).sort((a,b) => {
        const delta = p.ordenar_por === 'titulo' ? a.titulo.localeCompare(b.titulo,'pt-BR') :
          p.ordenar_por === 'ano' ? a.ano-b.ano : a.duracao_minutos-b.duracao_minutos;
        return delta * (p.ordem === 'desc' ? -1 : 1) || tituloAsc(a,b);
      });
      const pagina = encontrados.slice(p.offset, p.offset+p.limite);
      return envelope({ filtros_aplicados:p, total:encontrados.length, filmes:pagina.map(resumo),
        proximo_offset:p.offset+pagina.length<encontrados.length ? p.offset+pagina.length : null });
    },
    obterDetalhes(entrada) {
      const { id } = detalheSchema.parse(entrada); const filme = filmes.find(f => f.id === id);
      return envelope(filme ? { encontrado:true, filme } : { encontrado:false, id, mensagem:'Filme não encontrado no catálogo.' });
    },
    comparar(entrada) {
      const { ids } = compararSchema.parse(entrada);
      const encontrados = ids.map(id => filmes.find(f => f.id === id)).filter(Boolean);
      return envelope({ completa:encontrados.length === ids.length, filmes:encontrados,
        ids_nao_encontrados:ids.filter(id => !encontrados.some(f => f.id === id)),
        diferenca_duracao_minutos:encontrados.length>=2 ? Math.max(...encontrados.map(f=>f.duracao_minutos))-Math.min(...encontrados.map(f=>f.duracao_minutos)) : null });
    },
    planejarSessao(entrada) {
      const p = sessaoSchema.parse(entrada);
      const candidatos = selecionar(p.filtros);
      const intervalos = (p.quantidade_filmes-1)*p.intervalo_minutos;
      const combinacoes = [];
      // No máximo C(60,3)=34220 combinações. Não repete filmes nem depende da página de busca.
      function combinar(inicio, escolhidos, soma) {
        if (soma+intervalos>p.tempo_disponivel) return;
        if (escolhidos.length === p.quantidade_filmes) {
          combinacoes.push({ filmes:escolhidos.map(resumo), duracao_filmes:soma, duracao_intervalos:intervalos,
            duracao_total:soma+intervalos, tempo_restante:p.tempo_disponivel-soma-intervalos });
          return;
        }
        for(let i=inicio;i<=candidatos.length-(p.quantidade_filmes-escolhidos.length);i++) {
          combinar(i+1,[...escolhidos,candidatos[i]],soma+candidatos[i].duracao_minutos);
        }
      }
      combinar(0,[],0);
      combinacoes.sort((a,b)=>a.tempo_restante-b.tempo_restante || a.filmes.map(f=>f.id).join(',').localeCompare(b.filmes.map(f=>f.id).join(',')));
      return envelope({ parametros:p, criterio:'Menor tempo restante; desempate pelos IDs. Não é uma avaliação de qualidade.',
        total_combinacoes:combinacoes.length, sessoes:combinacoes.slice(0,p.limite),
        mensagem:combinacoes.length ? 'Combinações calculadas sem repetir filmes.' : 'Nenhuma combinação atende ao tempo e aos filtros. Os critérios foram preservados.' });
    },
    resumir(entrada = {}) {
      const p = resumoSchema.parse(entrada); const base = selecionar(p.filtros);
      const mapa = new Map();
      for(const f of base) {
        const chaves = p.agrupar_por==='genero' ? f.generos : p.agrupar_por==='clima' ? f.climas :
          [p.agrupar_por==='idade' ? String(f.idade_minima_sugerida) : p.agrupar_por==='pais' ? f.pais : f.disponivel ? 'disponível' : 'indisponível'];
        for(const chave of chaves) mapa.set(chave,(mapa.get(chave)||0)+1);
      }
      return envelope({ filtros_aplicados:p.filtros, total:base.length, disponiveis:base.filter(f=>f.disponivel).length,
        indisponiveis:base.filter(f=>!f.disponivel).length,
        duracao_media_minutos:base.length ? Math.round(base.reduce((s,f)=>s+f.duracao_minutos,0)/base.length*100)/100 : null,
        duracao_minima:base.length ? Math.min(...base.map(f=>f.duracao_minutos)) : null,
        duracao_maxima:base.length ? Math.max(...base.map(f=>f.duracao_minutos)) : null,
        agrupar_por:p.agrupar_por, grupos:[...mapa].sort(([a],[b])=>a.localeCompare(b,'pt-BR',{numeric:true})).map(([valor,quantidade])=>({valor,quantidade})),
        observacao:'Estatísticas de todos os registros que atendem aos filtros, sem paginação. Em gêneros e climas, um filme pode contar em mais de um grupo.' });
    },
    sugerirAlternativas(entrada) {
      const p = alternativasSchema.parse(entrada); const exatos = selecionar(p.filtros);
      if(exatos.length) return envelope({ filtros_originais:p.filtros, total_exatos:exatos.length, filmes_exatos:exatos.slice(0,p.limite).map(resumo), alternativas:[], mensagem:'Existem correspondências exatas; nenhum filtro foi flexibilizado.' });
      const flex = {...p.filtros};
      if(p.flexibilizar.includes('duracao_maxima') && flex.duracao_maxima!==undefined) flex.duracao_maxima=Math.min(300,flex.duracao_maxima+p.acrescimo_maximo_minutos);
      if(p.flexibilizar.includes('generos')) { delete flex.genero; delete flex.generos; }
      const sugestoes = selecionar(flex).map(f=>{
        const mudancas=[];
        if(p.filtros.duracao_maxima!==undefined && f.duracao_minutos>p.filtros.duracao_maxima) mudancas.push({ campo:'duracao_maxima', de:p.filtros.duracao_maxima, para:f.duracao_minutos, acrescimo_minutos:f.duracao_minutos-p.filtros.duracao_maxima });
        if(p.filtros.genero && !f.generos.includes(p.filtros.genero)) mudancas.push({campo:'genero',de:p.filtros.genero,para:null,explicacao:'Remover a exigência deste gênero.'});
        if(!grupo(f.generos,p.filtros.generos,p.filtros.modo_generos)) mudancas.push({campo:'generos',de:p.filtros.generos,para:null,explicacao:'Remover a exigência desta lista de gêneros.'});
        return {filme:resumo(f),mudancas};
      }).filter(s=>s.mudancas.length);
      sugestoes.sort((a,b)=>a.mudancas.length-b.mudancas.length ||
        (a.mudancas.find(m=>m.campo==='duracao_maxima')?.acrescimo_minutos||0)-(b.mudancas.find(m=>m.campo==='duracao_maxima')?.acrescimo_minutos||0) || tituloAsc(a.filme,b.filme));
      return envelope({filtros_originais:p.filtros,total_exatos:0,total_alternativas:sugestoes.length,alternativas:sugestoes.slice(0,p.limite),
        criterio:'Menos alterações, depois menor acréscimo de duração e título.',
        mensagem:'São propostas, não correspondências exatas. Idade, disponibilidade, exclusões de gêneros/conteúdo e demais filtros foram preservados.'});
    }
  };
}
