import { z } from 'zod';

export const GENEROS = ['comédia', 'aventura', 'animação', 'drama', 'ficção científica', 'fantasia', 'suspense', 'mistério', 'romance', 'documentário fictício'];
export const CLIMAS = ['leve', 'empolgante', 'emocionante', 'reflexivo', 'tenso', 'intrigante', 'acolhedor'];
export const TEMAS = ['amizade', 'família', 'viagem espacial', 'comunidade', 'recomeço', 'investigação', 'natureza', 'música', 'memória', 'criatividade', 'amor', 'aprendizado', 'viagem', 'tempo'];
export const CONTEUDOS = ['cenas de tensão', 'perigo em aventuras', 'conflitos familiares', 'temas adultos'];
const texto = z.string().trim().min(1).max(100);
const id = z.string().regex(/^FILME-\d{3}$/);
const lista = schema => z.array(schema).min(1).max(10).refine(a => new Set(a).size === a.length, 'Não repita valores na lista.');
const modo = z.enum(['qualquer', 'todos']).default('qualquer');
const minutos = z.number().int().min(1).max(300);
const ano = z.number().int().min(1900).max(2100);

export const filmeSchema = z.strictObject({
  id, titulo: texto, ano, generos: lista(z.enum(GENEROS)), duracao_minutos: minutos,
  idade_minima_sugerida: z.union([0, 10, 12, 14, 16, 18].map(n => z.literal(n))),
  climas: lista(z.enum(CLIMAS)), sinopse: z.string().trim().min(30).max(600), disponivel: z.boolean(),
  diretor: texto, pais: texto, idioma_original: texto,
  audios: lista(texto), legendas: lista(texto), temas: lista(z.enum(TEMAS)),
  avisos_conteudo: z.array(z.enum(CONTEUDOS)).max(4),
  colecao: z.strictObject({ nome: texto, ordem: z.number().int().min(1).max(20) }).nullable()
});
export const camposFiltro = {
  titulo: texto.optional().describe('Parte do título; ignora acentos e maiúsculas.'),
  genero: z.enum(GENEROS).optional().describe('Compatível com a primeira versão; combinado com os demais filtros.'),
  generos: lista(z.enum(GENEROS)).optional(), modo_generos: modo,
  excluir_generos: lista(z.enum(GENEROS)).optional(),
  clima: z.enum(CLIMAS).optional(), climas: lista(z.enum(CLIMAS)).optional(), modo_climas: modo,
  duracao_minima: minutos.optional(), duracao_maxima: minutos.optional(),
  ano: ano.optional(), ano_minimo: ano.optional(), ano_maximo: ano.optional(),
  idade_publico: z.number().int().min(0).max(18).optional().describe('Idade da pessoa mais nova; indicação didática, não oficial.'),
  somente_disponiveis: z.boolean().default(true),
  diretor: texto.optional().describe('Parte do nome, sem distinção de acento ou caixa.'), pais: texto.optional(),
  idioma_original: texto.optional(), audio: texto.optional(), legenda: texto.optional(),
  temas: lista(z.enum(TEMAS)).optional(), modo_temas: modo,
  excluir_conteudos: lista(z.enum(CONTEUDOS)).optional(),
  colecao: texto.optional().describe('Parte do nome da coleção.')
};
function conferirIntervalos(f, ctx) {
  for (const [min, max] of [['duracao_minima', 'duracao_maxima'], ['ano_minimo', 'ano_maximo']]) {
    if (f[min] !== undefined && f[max] !== undefined && f[min] > f[max]) ctx.addIssue({ code: 'custom', path: [max], message: 'O máximo precisa ser maior ou igual ao mínimo.' });
  }
  if (f.ano !== undefined && ((f.ano_minimo !== undefined && f.ano < f.ano_minimo) || (f.ano_maximo !== undefined && f.ano > f.ano_maximo))) {
    ctx.addIssue({ code: 'custom', path: ['ano'], message: 'O ano exato está fora do intervalo informado.' });
  }
}
export const filtroSchema = z.strictObject(camposFiltro).superRefine(conferirIntervalos);
export const buscaSchema = z.strictObject({ ...camposFiltro,
  ordenar_por: z.enum(['titulo', 'duracao', 'ano']).default('titulo'), ordem: z.enum(['asc', 'desc']).default('asc'),
  limite: z.number().int().min(1).max(10).default(5), offset: z.number().int().min(0).max(100000).default(0)
}).superRefine(conferirIntervalos);
export const detalheSchema = z.strictObject({ id });
export const compararSchema = z.strictObject({ ids: lista(id).refine(a => a.length >= 2 && a.length <= 5, 'Informe de dois a cinco IDs diferentes.') });
export const sessaoSchema = z.strictObject({
  tempo_disponivel: z.number().int().min(1).max(1000),
  quantidade_filmes: z.number().int().min(1).max(3).default(2),
  intervalo_minutos: z.number().int().min(0).max(60).default(10),
  filtros: filtroSchema.prefault({}), limite: z.number().int().min(1).max(5).default(3)
}).refine(p => p.filtros.somente_disponiveis, 'Sessões usam apenas filmes disponíveis.');
export const resumoSchema = z.strictObject({
  filtros: z.strictObject({ ...camposFiltro, somente_disponiveis: z.boolean().default(false) }).superRefine(conferirIntervalos).prefault({}), agrupar_por: z.enum(['genero', 'clima', 'idade', 'pais', 'disponibilidade']).default('genero')
});
export const alternativasSchema = z.strictObject({
  filtros: filtroSchema,
  flexibilizar: lista(z.enum(['duracao_maxima', 'generos'])).default(['duracao_maxima']),
  acrescimo_maximo_minutos: z.number().int().min(1).max(60).default(30),
  limite: z.number().int().min(1).max(5).default(3)
});
