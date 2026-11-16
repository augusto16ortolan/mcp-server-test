import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { CLIMAS, TEMAS, CONTEUDOS, filmeSchema, buscaSchema, detalheSchema, compararSchema, sessaoSchema, resumoSchema, alternativasSchema } from './schemas.mjs';
export { GENEROS, CLIMAS, buscaSchema, detalheSchema } from './schemas.mjs';
export const AVISO = 'Catálogo misto: tipo real indica metadados do Wikidata; tipo ficticio indica exemplo inventado. Disponibilidade é apenas inclusão no catálogo, não streaming ou licença de exibição. Notas IMDb via Wikidata são históricas. Campos nulos ou listas vazias podem indicar informação desconhecida; não suponha adequação etária, ausência de conteúdo, áudio ou legendas.';
export const normalizar = texto => texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
const contem = (valor, termo) => !termo || (typeof valor === 'string' && normalizar(valor).includes(normalizar(termo)));
const igual = (valor, termo) => !termo || (typeof valor === 'string' && normalizar(valor) === normalizar(termo));
const inclui = (valores, pedido) => valores.some(v => igual(v, pedido));
const grupo = (valores, pedidos, modo) => !pedidos || (modo === 'todos' ? pedidos.every(x => inclui(valores, x)) : pedidos.some(x => inclui(valores, x)));
const tituloAsc = (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR') || a.id.localeCompare(b.id);
const diretores = f => f.diretores.length ? f.diretores : f.diretor ? [f.diretor] : [];
const paises = f => f.paises.length ? f.paises : f.pais ? [f.pais] : [];
const idiomas = f => f.idiomas_originais.length ? f.idiomas_originais : f.idioma_original ? [f.idioma_original] : [];
const envelope = dados => ({ aviso: AVISO, ...dados });
// A busca não envia todo o elenco, notas de importação e metadados de licença a cada filme.
const resumo = f => ({ id: f.id, tipo: f.tipo, titulo: f.titulo, titulo_original: f.titulo_original, ano: f.ano,
  generos: f.generos, duracao_minutos: f.duracao_minutos, idade_minima_sugerida: f.idade_minima_sugerida,
  climas: f.climas, disponivel: f.disponivel, diretor: f.diretor, pais: f.pais, idioma_original: f.idioma_original,
  audios: f.audios, legendas: f.legendas, temas: f.temas, avisos_conteudo: f.avisos_conteudo, colecao: f.colecao,
  avaliacao: f.avaliacao, poster_url: f.poster_url, imagem: f.imagem, fonte_url: f.fonte?.url || null });
function congelar(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.values(valor).forEach(congelar); Object.freeze(valor);
  }
  return valor;
}
export function validarCatalogo(dados) {
  const filmes = z.array(filmeSchema).min(1).parse(dados);
  if (new Set(filmes.map(f => f.id)).size !== filmes.length) throw new Error('O catálogo contém IDs duplicados.');
  const posicoes = filmes.filter(f => f.colecao).map(f => `${f.colecao.nome}:${f.colecao.ordem}`);
  if (new Set(posicoes).size !== posicoes.length) throw new Error('Ordem repetida dentro de uma coleção.');
  return congelar(filmes);
}
export function carregarCatalogo(arquivo) {
  const ler = a => JSON.parse(readFileSync(a, 'utf8'));
  if (arquivo) return validarCatalogo(ler(arquivo));
  return validarCatalogo([...ler(new URL('../dados/filmes.json', import.meta.url)), ...ler(new URL('../dados/filmes-reais.json', import.meta.url))]);
}
export function corresponde(f, p) {
  return (p.catalogo === undefined || p.catalogo === 'todos' || f.tipo === (p.catalogo === 'reais' ? 'real' : 'ficticio')) &&
    (!p.titulo || contem(f.titulo, p.titulo) || contem(f.titulo_original, p.titulo) || f.titulos_alternativos.some(t => contem(t, p.titulo))) &&
    (!p.diretor || diretores(f).some(d => contem(d, p.diretor))) && (!p.pais || paises(f).some(v => igual(v, p.pais))) &&
    (!p.idioma_original || idiomas(f).some(v => igual(v, p.idioma_original))) &&
    (!p.ator || f.elenco.some(a => contem(a.nome, p.ator))) &&
    (p.nota_minima === undefined || (f.avaliacao !== null && f.avaliacao.nota >= p.nota_minima)) &&
    (p.votos_minimos === undefined || (f.avaliacao?.votos != null && f.avaliacao.votos >= p.votos_minimos)) &&
    (p.com_imagem === undefined || Boolean(f.imagem) === p.com_imagem) && (p.com_poster === undefined || Boolean(f.poster_url) === p.com_poster) &&
    (!p.audio || inclui(f.audios, p.audio)) && (!p.legenda || inclui(f.legendas, p.legenda)) &&
    (!p.colecao || (f.colecao !== null && contem(f.colecao.nome, p.colecao))) &&
    (!p.genero || inclui(f.generos, p.genero)) && grupo(f.generos, p.generos, p.modo_generos) &&
    (!p.excluir_generos || (f.generos.length > 0 && !p.excluir_generos.some(g => inclui(f.generos, g)))) &&
    (!p.clima || f.climas.includes(p.clima)) && grupo(f.climas, p.climas, p.modo_climas) &&
    grupo(f.temas, p.temas, p.modo_temas) &&
    (!p.excluir_conteudos || (f.avisos_conteudo !== null && !p.excluir_conteudos.some(c => f.avisos_conteudo.includes(c)))) &&
    (p.duracao_minima === undefined || (f.duracao_minutos !== null && f.duracao_minutos >= p.duracao_minima)) &&
    (p.duracao_maxima === undefined || (f.duracao_minutos !== null && f.duracao_minutos <= p.duracao_maxima)) &&
    (p.ano === undefined || f.ano === p.ano) &&
    (p.ano_minimo === undefined || (f.ano !== null && f.ano >= p.ano_minimo)) &&
    (p.ano_maximo === undefined || (f.ano !== null && f.ano <= p.ano_maximo)) &&
    (p.idade_publico === undefined || (f.idade_minima_sugerida !== null && f.idade_minima_sugerida <= p.idade_publico)) &&
    (!p.somente_disponiveis || f.disponivel);
}
export function criarConsultas(filmes) {
  const ordenados = [...filmes].sort(tituloAsc);
  const selecionar = p => ordenados.filter(f => corresponde(f, p));
  const valores = campo => [...new Set(filmes.flatMap(f => typeof campo === 'function' ? campo(f) : f[campo]).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));
  const duracoes = filmes.map(f => f.duracao_minutos).filter(v => v !== null);
  const anos = filmes.map(f => f.ano).filter(v => v !== null);
  return {
    listarFiltros() {
      return envelope({ catalogos: ['todos', 'reais', 'ficticios'], generos: valores('generos'), climas: CLIMAS, temas: TEMAS, avisos_conteudo: CONTEUDOS,
        paises: valores(paises), diretores: valores(diretores), idiomas_originais: valores(idiomas),
        filtro_ator: 'Parte do nome do ator, consultado no elenco de cada ficha. Elenco pode ser incompleto.',
        avaliacao: 'IMDb via Wikidata, escala 0–10, histórica; use nota_minima e votos_minimos.',
        audios: valores('audios'), legendas: valores('legendas'), colecoes: valores(f => f.colecao ? [f.colecao.nome] : []),
        modos: ['qualquer', 'todos'], ordenar_por: ['titulo', 'duracao', 'ano', 'nota', 'votos'], ordens: ['asc', 'desc'],
        idades_sugeridas: [0,10,12,14,16,18], total: filmes.length,
        reais: filmes.filter(f => f.tipo === 'real').length, ficticios: filmes.filter(f => f.tipo === 'ficticio').length,
        disponiveis: filmes.filter(f => f.disponivel).length,
        com_avaliacao: filmes.filter(f => f.avaliacao).length, com_imagem: filmes.filter(f => f.imagem).length, com_poster: filmes.filter(f => f.poster_url).length,
        duracao_minima: duracoes.length ? Math.min(...duracoes) : null, duracao_maxima: duracoes.length ? Math.max(...duracoes) : null,
        ano_minimo: anos.length ? Math.min(...anos) : null, ano_maximo: anos.length ? Math.max(...anos) : null });
    },
    buscar(entrada = {}) {
      const p = buscaSchema.parse(entrada);
      const numero = f => p.ordenar_por === 'ano' ? f.ano : p.ordenar_por === 'nota' ? f.avaliacao?.nota : p.ordenar_por === 'votos' ? f.avaliacao?.votos : f.duracao_minutos;
      const encontrados = selecionar(p).sort((a,b) => {
        if (p.ordenar_por !== 'titulo') {
          const va = numero(a), vb = numero(b);
          // Valores desconhecidos ficam no fim em ambas as direções.
          if (va == null || vb == null) return (va == null ? 1 : 0) - (vb == null ? 1 : 0) || tituloAsc(a,b);
          return (va-vb) * (p.ordem === 'desc' ? -1 : 1) || tituloAsc(a,b);
        }
        return a.titulo.localeCompare(b.titulo,'pt-BR') * (p.ordem === 'desc' ? -1 : 1) || tituloAsc(a,b);
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
      const duracoes = encontrados.map(f => f.duracao_minutos);
      return envelope({ completa:encontrados.length === ids.length, filmes:encontrados,
        ids_nao_encontrados:ids.filter(id => !encontrados.some(f => f.id === id)),
        diferenca_duracao_minutos:encontrados.length >= 2 && duracoes.every(v => v !== null) ? Math.max(...duracoes)-Math.min(...duracoes) : null });
    },
    planejarSessao(entrada) {
      const p = sessaoSchema.parse(entrada);
      const filtrados = selecionar(p.filtros);
      const candidatos = filtrados.filter(f => f.duracao_minutos !== null);
      const intervalos = (p.quantidade_filmes-1)*p.intervalo_minutos;
      const melhores = [];
      let total = 0;
      const comparar = (a,b) => a.tempo_restante-b.tempo_restante || a.chave.localeCompare(b.chave);
      // Conta todas as combinações, mas mantém apenas os K melhores resultados na memória.
      function combinar(inicio, escolhidos, soma) {
        if (soma+intervalos > p.tempo_disponivel) return;
        if (escolhidos.length === p.quantidade_filmes) {
          total++;
          const restante = p.tempo_disponivel-soma-intervalos;
          if (melhores.length === p.limite && restante > melhores.at(-1).tempo_restante) return;
          const opcao = { filmes:[...escolhidos], duracao_filmes:soma, duracao_intervalos:intervalos,
            duracao_total:soma+intervalos, tempo_restante:restante, chave:escolhidos.map(f=>f.id).join(',') };
          if (melhores.length < p.limite || comparar(opcao,melhores.at(-1)) < 0) {
            melhores.push(opcao); melhores.sort(comparar); if(melhores.length>p.limite) melhores.pop();
          }
          return;
        }
        for(let i=inicio;i<=candidatos.length-(p.quantidade_filmes-escolhidos.length);i++) {
          escolhidos.push(candidatos[i]); combinar(i+1,escolhidos,soma+candidatos[i].duracao_minutos); escolhidos.pop();
        }
      }
      combinar(0,[],0);
      return envelope({ parametros:p, criterio:'Menor tempo restante; desempate pelos IDs. Não é uma avaliação de qualidade.',
        excluidos_sem_duracao:filtrados.length-candidatos.length, total_combinacoes:total,
        sessoes:melhores.map(({chave,filmes,...s})=>({...s,filmes:filmes.map(resumo)})),
        mensagem:total ? 'Combinações calculadas sem repetir filmes; disponibilidade refere-se ao catálogo local.' : 'Nenhuma combinação atende ao tempo e aos filtros. Os critérios foram preservados.' });
    },
    resumir(entrada = {}) {
      const p = resumoSchema.parse(entrada); const base = selecionar(p.filtros);
      const mapa = new Map();
      for(const f of base) {
        const chaves = p.agrupar_por === 'genero' ? f.generos : p.agrupar_por === 'clima' ? f.climas :
          p.agrupar_por === 'pais' ? paises(f) : p.agrupar_por === 'diretor' ? diretores(f) :
          [p.agrupar_por === 'idade' ? (f.idade_minima_sugerida === null ? 'não informado' : String(f.idade_minima_sugerida)) :
            p.agrupar_por === 'tipo' ? f.tipo : f.disponivel ? 'disponível' : 'indisponível'];
        for(const chave of chaves.length ? chaves : ['não informado']) mapa.set(chave,(mapa.get(chave)||0)+1);
      }
      const duracoes = base.map(f=>f.duracao_minutos).filter(v=>v!==null);
      return envelope({ filtros_aplicados:p.filtros, total:base.length, disponiveis:base.filter(f=>f.disponivel).length,
        indisponiveis:base.filter(f=>!f.disponivel).length, reais:base.filter(f=>f.tipo==='real').length, ficticios:base.filter(f=>f.tipo==='ficticio').length,
        com_avaliacao:base.filter(f=>f.avaliacao).length, com_imagem:base.filter(f=>f.imagem).length, com_poster:base.filter(f=>f.poster_url).length,
        com_duracao:duracoes.length, sem_duracao:base.length-duracoes.length,
        duracao_media_minutos:duracoes.length ? Math.round(duracoes.reduce((s,n)=>s+n,0)/duracoes.length*100)/100 : null,
        duracao_minima:duracoes.length ? Math.min(...duracoes) : null, duracao_maxima:duracoes.length ? Math.max(...duracoes) : null,
        agrupar_por:p.agrupar_por, grupos:[...mapa].sort(([a],[b])=>a.localeCompare(b,'pt-BR',{numeric:true})).map(([valor,quantidade])=>({valor,quantidade})),
        observacao:'Estatísticas de todos os resultados, sem paginação. Média de duração usa somente valores conhecidos. Grupos podem se sobrepor (vários gêneros, climas, países ou diretores).' });
    },
    sugerirAlternativas(entrada) {
      const p = alternativasSchema.parse(entrada); const exatos = selecionar(p.filtros);
      if(exatos.length) return envelope({ filtros_originais:p.filtros, total_exatos:exatos.length, filmes_exatos:exatos.slice(0,p.limite).map(resumo), alternativas:[], mensagem:'Existem correspondências exatas; nenhum filtro foi flexibilizado.' });
      const flex = {...p.filtros};
      if(p.flexibilizar.includes('duracao_maxima') && flex.duracao_maxima!==undefined) flex.duracao_maxima=Math.min(600,flex.duracao_maxima+p.acrescimo_maximo_minutos);
      if(p.flexibilizar.includes('generos')) { delete flex.genero; delete flex.generos; }
      const sugestoes = selecionar(flex).map(f=>{
        const mudancas=[];
        if(p.filtros.duracao_maxima!==undefined && f.duracao_minutos>p.filtros.duracao_maxima) mudancas.push({ campo:'duracao_maxima', de:p.filtros.duracao_maxima, para:f.duracao_minutos, acrescimo_minutos:f.duracao_minutos-p.filtros.duracao_maxima });
        if(p.filtros.genero && !inclui(f.generos,p.filtros.genero)) mudancas.push({campo:'genero',de:p.filtros.genero,para:null,explicacao:'Remover a exigência deste gênero.'});
        if(!grupo(f.generos,p.filtros.generos,p.filtros.modo_generos)) mudancas.push({campo:'generos',de:p.filtros.generos,para:null,explicacao:'Remover a exigência desta lista de gêneros.'});
        return {filme:resumo(f),mudancas};
      }).filter(s=>s.mudancas.length);
      sugestoes.sort((a,b)=>a.mudancas.length-b.mudancas.length ||
        (a.mudancas.find(m=>m.campo==='duracao_maxima')?.acrescimo_minutos||0)-(b.mudancas.find(m=>m.campo==='duracao_maxima')?.acrescimo_minutos||0) || tituloAsc(a.filme,b.filme));
      return envelope({filtros_originais:p.filtros,total_exatos:0,total_alternativas:sugestoes.length,alternativas:sugestoes.slice(0,p.limite),
        criterio:'Menos alterações, depois menor acréscimo de duração e título.',
        mensagem:'Propostas, não correspondências exatas. Catálogo, idade, disponibilidade, exclusões, ator, nota e demais filtros foram preservados.'});
    }
  };
}
