import { z } from 'zod';

export const GENEROS = ['comédia', 'aventura', 'animação', 'drama', 'ficção científica', 'fantasia', 'suspense', 'mistério', 'romance', 'documentário fictício'];
export const CLIMAS = ['leve', 'empolgante', 'emocionante', 'reflexivo', 'tenso', 'intrigante', 'acolhedor'];
export const TEMAS = ['amizade', 'família', 'viagem espacial', 'comunidade', 'recomeço', 'investigação', 'natureza', 'música', 'memória', 'criatividade', 'amor', 'aprendizado', 'viagem', 'tempo'];
export const CONTEUDOS = ['cenas de tensão', 'perigo em aventuras', 'conflitos familiares', 'temas adultos'];
const texto = z.string().trim().min(1).max(300);
const id = z.string().regex(/^(FILME-\d{3}|REAL-Q\d+)$/);
const lista = schema => z.array(schema).min(1).max(10).refine(a => new Set(a).size === a.length, 'Não repita valores na lista.');
const textos = z.array(texto).max(100);
const modo = z.enum(['qualquer', 'todos']).default('qualquer');
const minutos = z.number().min(1).max(600);
const ano = z.number().int().min(1888).max(2100);
const url = z.url().refine(u => u.startsWith('https://'), 'Use uma URL HTTPS.');
const imagemSchema = z.strictObject({ tipo: z.enum(['poster', 'imagem_relacionada']), url, pagina: url,
  licenca: texto, licenca_url: url.nullable(), autor: z.string().max(10000), credito: z.string().max(10000).nullable() });
const avaliacaoSchema = z.strictObject({ fonte: z.literal('IMDb via Wikidata'), nota: z.number().min(0).max(10), escala: z.literal(10),
  votos: z.number().int().nonnegative().nullable(), data_avaliacao: z.string().regex(/^\d{4}(-\d{2})?(-\d{2})?$/).nullable(), url, declaracao: texto });
export const filmeSchema = z.strictObject({
  id, tipo: z.enum(['ficticio', 'real']).default('ficticio'), titulo: texto, titulo_original: texto.nullable().default(null),
  titulos_alternativos: textos.default([]), ano: ano.nullable(), generos: textos, generos_originais: textos.default([]), duracao_minutos: minutos.nullable(),
  idade_minima_sugerida: z.union([0, 10, 12, 14, 16, 18].map(n => z.literal(n))).nullable(),
  climas: z.array(z.enum(CLIMAS)), sinopse: z.string().trim().min(30).max(600).nullable(),
  descricao: z.string().max(1000).nullable().default(null), disponivel: z.boolean(),
  disponibilidade_observacao: texto.default('Disponibilidade fictícia do exercício; não informa streaming ou licença de exibição.'),
  diretor: z.string().max(2000).nullable(), diretores: textos.default([]), pais: texto.nullable(), paises: textos.default([]),
  idioma_original: texto.nullable(), idiomas_originais: textos.default([]),
  audios: textos, legendas: textos, temas: z.array(z.enum(TEMAS)),
  avisos_conteudo: z.array(z.enum(CONTEUDOS)).max(4).nullable(),
  colecao: z.strictObject({ nome: texto, ordem: z.number().int().min(1).max(20) }).nullable(),
  elenco: z.array(z.strictObject({ nome: texto, interpretacao: z.enum(['atuação','voz']).default('atuação'), wikidata_id: z.string().regex(/^Q\d+$/), personagens: textos })).max(20).default([]),
  avaliacao: avaliacaoSchema.nullable().default(null), poster_url: url.nullable().default(null), imagem: imagemSchema.nullable().default(null),
  identificadores: z.strictObject({ wikidata: z.string().regex(/^Q\d+$/), imdb: z.string().regex(/^tt\d+$/).nullable(), tmdb: z.string().regex(/^\d+$/).nullable() }).nullable().default(null),
  fonte: z.strictObject({ nome: z.literal('Wikidata'), url, revisao: z.number().int().positive(), consultado_em: z.iso.datetime(), licenca_dados: z.literal('CC0-1.0'),
    propriedades: z.record(z.string(), z.string().regex(/^P\d+$/)), declaracao_duracao: texto.nullable() }).nullable().default(null),
  observacoes: textos.default([])
}).superRefine((f, ctx) => {
  if (f.tipo === 'real' && (!f.fonte || !f.identificadores || f.id !== `REAL-${f.identificadores.wikidata}`)) ctx.addIssue({code:'custom', message:'Filme real precisa de fonte e identificador consistente.'});
  if (f.tipo === 'ficticio' && (f.fonte || f.avaliacao || f.id.startsWith('REAL-'))) ctx.addIssue({code:'custom', message:'Filme fictício não pode ter fonte ou avaliação real.'});
  if (f.poster_url && (f.imagem?.tipo !== 'poster' || f.imagem.url !== f.poster_url)) ctx.addIssue({code:'custom', message:'URL de pôster exige imagem identificada como pôster.'});
});
export const camposFiltro = {
  catalogo: z.enum(['todos', 'reais', 'ficticios']).default('todos').describe('Separa filmes reais de exemplos fictícios. Padrão: ambos.'),
  titulo: texto.optional().describe('Parte do título exibido ou original; ignora acentos e maiúsculas.'),
  genero: texto.optional().describe('Use listar_filtros para descobrir os gêneros. Combinado com os demais filtros.'),
  generos: lista(texto).optional(), modo_generos: modo,
  excluir_generos: lista(texto).optional(),
  clima: z.enum(CLIMAS).optional(), climas: lista(z.enum(CLIMAS)).optional(), modo_climas: modo,
  duracao_minima: minutos.optional(), duracao_maxima: minutos.optional(),
  ano: ano.optional(), ano_minimo: ano.optional(), ano_maximo: ano.optional(),
  idade_publico: z.number().int().min(0).max(18).optional().describe('Idade da pessoa mais nova. Exclui indicação desconhecida; exemplos fictícios têm indicação apenas didática.'),
  somente_disponiveis: z.boolean().default(true).describe('Disponibilidade no catálogo local; NÃO indica streaming ou licença de exibição.'),
  diretor: texto.optional().describe('Parte do nome de qualquer diretor, sem distinção de acento ou caixa.'), pais: texto.optional(),
  ator: texto.optional().describe('Parte do nome no elenco registrado; elenco pode ser incompleto.'),
  nota_minima: z.number().min(0).max(10).optional().describe('Nota IMDb /10 registrada no Wikidata, histórica. Ausentes são excluídos.'),
  votos_minimos: z.number().int().min(0).max(1000000000).optional(),
  com_imagem: z.boolean().optional(), com_poster: z.boolean().optional(),
  idioma_original: texto.optional(), audio: texto.optional(), legenda: texto.optional(),
  temas: lista(z.enum(TEMAS)).optional(), modo_temas: modo,
  excluir_conteudos: lista(z.enum(CONTEUDOS)).optional().describe('Exclui também filmes cujos avisos de conteúdo são desconhecidos.'),
  colecao: texto.optional().describe('Parte do nome da coleção.')
};
function conferirIntervalos(f, ctx) {
  for (const [min, max] of [['duracao_minima', 'duracao_maxima'], ['ano_minimo', 'ano_maximo']]) {
    if (f[min] !== undefined && f[max] !== undefined && f[min] > f[max]) ctx.addIssue({ code: 'custom', path: [max], message: 'O máximo precisa ser maior ou igual ao mínimo.' });
  }
  if (f.ano !== undefined && ((f.ano_minimo !== undefined && f.ano < f.ano_minimo) || (f.ano_maximo !== undefined && f.ano > f.ano_maximo))) ctx.addIssue({ code: 'custom', path: ['ano'], message: 'O ano exato está fora do intervalo informado.' });
}
export const filtroSchema = z.strictObject(camposFiltro).superRefine(conferirIntervalos);
export const buscaSchema = z.strictObject({ ...camposFiltro,
  ordenar_por: z.enum(['titulo', 'duracao', 'ano', 'nota', 'votos']).default('titulo'), ordem: z.enum(['asc', 'desc']).default('asc'),
  limite: z.number().int().min(1).max(10).default(5), offset: z.number().int().min(0).max(100000).default(0)
}).superRefine(conferirIntervalos);
export const detalheSchema = z.strictObject({ id });
export const compararSchema = z.strictObject({ ids: lista(id).refine(a => a.length >= 2 && a.length <= 5, 'Informe de dois a cinco IDs diferentes.') });
export const sessaoSchema = z.strictObject({
  tempo_disponivel: z.number().int().min(1).max(2000), quantidade_filmes: z.number().int().min(1).max(3).default(2),
  intervalo_minutos: z.number().int().min(0).max(60).default(10),
  filtros: filtroSchema.prefault({}), limite: z.number().int().min(1).max(5).default(3)
}).refine(p => p.filtros.somente_disponiveis, 'Sessões usam apenas filmes disponíveis no catálogo local.');
export const resumoSchema = z.strictObject({
  filtros: z.strictObject({ ...camposFiltro, somente_disponiveis: z.boolean().default(false) }).superRefine(conferirIntervalos).prefault({}),
  agrupar_por: z.enum(['genero', 'clima', 'idade', 'pais', 'disponibilidade', 'tipo', 'diretor']).default('genero')
});
export const alternativasSchema = z.strictObject({
  filtros: filtroSchema, flexibilizar: lista(z.enum(['duracao_maxima', 'generos'])).default(['duracao_maxima']),
  acrescimo_maximo_minutos: z.number().int().min(1).max(60).default(30), limite: z.number().int().min(1).max(5).default(3)
});
