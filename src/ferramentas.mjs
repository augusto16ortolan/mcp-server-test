import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { AVISO, criarConsultas } from './catalogo.mjs';
import { buscaSchema, detalheSchema, compararSchema, sessaoSchema, resumoSchema, alternativasSchema } from './schemas.mjs';

export function criarServidor(filmes, log = console.error) {
  const consultas = criarConsultas(filmes);
  const servidor = new McpServer({ name: 'cinecatalogo', version: '2.0.0' }, {
    instructions: `${AVISO} Consulte as ferramentas antes de recomendar. Não invente registros nem relaxe filtros sem informar. Use os IDs retornados para buscar detalhes. Não há operações de escrita.`
  });
  const registrar = (nome, descricao, schema, executar) => servidor.registerTool(nome, {
    description: descricao, inputSchema: schema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, async argumentos => {
    const inicio = performance.now();
    try {
      const dados = executar(argumentos);
      log(JSON.stringify({ ferramenta: nome, sucesso: true, duracao_ms: Math.round(performance.now() - inicio), retornados: dados.filmes?.length ?? dados.sessoes?.length ?? dados.filmes_exatos?.length ?? dados.alternativas?.length ?? dados.grupos?.length ?? (dados.encontrado ? 1 : 0) }));
      return { content: [{ type: 'text', text: JSON.stringify(dados) }], structuredContent: dados };
    } catch (erro) {
      log(JSON.stringify({ ferramenta: nome, sucesso: false }));
      throw erro;
    }
  });
  registrar('listar_filtros', 'Lista gêneros, climas, temas, avisos de conteúdo, diretores, países, idiomas, coleções e limites válidos dos catálogos real e fictício. Não altera dados.', z.strictObject({}), () => consultas.listarFiltros());
  registrar('buscar_filmes', 'Busca filmes reais e/ou fictícios combinando TODOS os filtros. Para filmes reais use catalogo=reais; aceita ator, diretor, nota_minima, votos_minimos e com_poster. Retorna no máximo 10 por página, sem sinopse. Lista vazia significa nenhuma correspondência, não autorização para inventar filmes. Use proximo_offset para continuar.', buscaSchema, a => consultas.buscar(a));
  registrar('obter_detalhes_filme', 'Consulta ficha completa por ID: elenco, personagens, diretores, fonte, nota histórica e imagem com licença. Sinopse e outros campos podem ser desconhecidos. Não trate imagem_relacionada como pôster. Não altera dados.', detalheSchema, a => consultas.obterDetalhes(a));
  registrar('comparar_filmes', 'Compara fichas completas de dois a cinco IDs distintos. Informa IDs ausentes e diferença de duração sem inventar registros.', compararSchema, a => consultas.comparar(a));
  registrar('planejar_sessao', 'Calcula combinações de um a três filmes disponíveis no catálogo local com duração conhecida dentro do tempo total, incluindo intervalos entre filmes. Mantém todos os filtros. Ordena por menor tempo restante; não representa avaliação de qualidade.', sessaoSchema, a => consultas.planejarSessao(a));
  registrar('resumir_catalogo', 'Calcula estatísticas sobre TODOS os registros filtrados, sem paginação. Por padrão inclui disponíveis e indisponíveis. Grupos de gêneros/climas podem se sobrepor.', resumoSchema, a => consultas.resumir(a));
  registrar('sugerir_alternativas', 'Quando não há resultados exatos, propõe flexibilizar apenas duração máxima e/ou gêneros de inclusão, se solicitado. Explicita cada mudança. Nunca relaxa idade, disponibilidade ou exclusões. Não apresenta sugestões como correspondências exatas.', alternativasSchema, a => consultas.sugerirAlternativas(a));
  return servidor;
}
