import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const destino = process.argv[2];
if (destino && !/^https?:\/\//.test(destino)) throw new Error('Informe uma URL http(s) terminada em /mcp ou omita para testar stdio.');
const cliente = new Client({ name: 'verificador-cinema', version: '1.0.0' });
const transporte = destino ? new StreamableHTTPClientTransport(new URL(destino)) : new StdioClientTransport({
  command: process.execPath, args: [fileURLToPath(new URL('../src/servidor-stdio.mjs', import.meta.url))], stderr: 'inherit'
});
try {
  await cliente.connect(transporte);
  const { tools } = await cliente.listTools();
  assert.deepEqual(tools.map(t => t.name).sort(), ['buscar_filmes', 'comparar_filmes', 'listar_filtros', 'obter_detalhes_filme', 'planejar_sessao', 'resumir_catalogo', 'sugerir_alternativas']);
  console.log('Ferramentas descobertas:', tools.map(t => t.name).join(', '));
  const filtros = await cliente.callTool({ name: 'listar_filtros', arguments: {} });
  assert.equal(filtros.structuredContent.total, 60);
  const argumentos = { genero: 'comédia', duracao_maxima: 110, limite: 5 };
  console.log('Argumentos:', JSON.stringify(argumentos));
  const busca = await cliente.callTool({ name: 'buscar_filmes', arguments: argumentos });
  assert.equal(busca.structuredContent.total, 4);
  console.log('Resultado:', JSON.stringify(busca.structuredContent, null, 2));
  const detalhes = await cliente.callTool({ name: 'obter_detalhes_filme', arguments: { id: 'FILME-001' } });
  assert.equal(detalhes.structuredContent.filme.titulo, 'O Último Ônibus para Saturno');
  console.log('Detalhes:', JSON.stringify(detalhes.structuredContent, null, 2));
  const comparar = await cliente.callTool({ name: 'comparar_filmes', arguments: { ids: ['FILME-001', 'FILME-004'] } });
  assert.equal(comparar.structuredContent.diferenca_duracao_minutos, 16);
  const sessao = await cliente.callTool({ name: 'planejar_sessao', arguments: { tempo_disponivel: 180 } });
  assert.ok(sessao.structuredContent.sessoes.length > 0);
  assert.ok(sessao.structuredContent.sessoes.every(s => s.duracao_total <= 180));
  const resumo = await cliente.callTool({ name: 'resumir_catalogo', arguments: {} });
  assert.equal(resumo.structuredContent.total, 60);
  assert.equal(resumo.structuredContent.disponiveis, 48);
  const alternativas = await cliente.callTool({ name: 'sugerir_alternativas', arguments: { filtros: { genero: 'comédia', duracao_maxima: 70, idade_publico: 0 }, acrescimo_maximo_minutos: 20 } });
  assert.equal(alternativas.structuredContent.total_alternativas, 2);
  console.log('Consultas avançadas: comparação, sessão, estatísticas e alternativas verificadas.');
  console.log('Verificação MCP concluída. Este cliente não utiliza modelo de IA.');
} finally { await cliente.close(); }
