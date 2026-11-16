import { test } from 'node:test';
import { request } from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { iniciarHttp } from '../src/servidor-http.mjs';
import { carregarCatalogo, criarConsultas } from '../src/catalogo.mjs';

const consultas = criarConsultas(carregarCatalogo());
async function conferir(transporte) {
  const cliente = new Client({ name: 'teste-cinema', version: '1.0.0' });
  try {
    await cliente.connect(transporte);
    const { tools } = await cliente.listTools();
    assert.deepEqual(tools.map(t => t.name).sort(), ['buscar_filmes', 'comparar_filmes', 'listar_filtros', 'obter_detalhes_filme', 'planejar_sessao', 'resumir_catalogo', 'sugerir_alternativas']);
    assert.ok(tools.every(t => t.annotations.readOnlyHint));
    const lista = await cliente.callTool({ name: 'listar_filtros', arguments: {} });
    assert.equal(lista.structuredContent.total, 160);
    const real = await cliente.callTool({ name: 'buscar_filmes', arguments: { catalogo: 'reais', ator: 'DiCaprio', titulo: 'Inception' } });
    assert.equal(real.structuredContent.total, 1);
    assert.equal(real.structuredContent.filmes[0].id, 'REAL-Q25188');
    const ficha = await cliente.callTool({ name: 'obter_detalhes_filme', arguments: { id: 'REAL-Q25188' } });
    assert.equal(ficha.structuredContent.filme.fonte.nome, 'Wikidata');
    assert.ok(ficha.structuredContent.filme.elenco.length > 0);
    const semClassificacao = await cliente.callTool({ name: 'buscar_filmes', arguments: { catalogo: 'reais', idade_publico: 10 } });
    assert.equal(semClassificacao.structuredContent.total, 0);
    const args = { genero: 'comédia', duracao_maxima: 110 };
    const r = await cliente.callTool({ name: 'buscar_filmes', arguments: args });
    assert.deepEqual(r.structuredContent, consultas.buscar(args));
    const detalhe = await cliente.callTool({ name: 'obter_detalhes_filme', arguments: { id: 'FILME-001' } });
    assert.equal(detalhe.structuredContent.filme.titulo, 'O Último Ônibus para Saturno');
    const inexistente = await cliente.callTool({ name: 'obter_detalhes_filme', arguments: { id: 'FILME-999' } });
    assert.equal(inexistente.structuredContent.encontrado, false);
    const comparacao = await cliente.callTool({ name: 'comparar_filmes', arguments: { ids: ['FILME-001', 'FILME-004'] } });
    assert.equal(comparacao.structuredContent.diferenca_duracao_minutos, 16);
    const sessao = await cliente.callTool({ name: 'planejar_sessao', arguments: { tempo_disponivel: 180, filtros: { clima: 'leve' } } });
    assert.ok(sessao.structuredContent.sessoes.length > 0);
    assert.ok(sessao.structuredContent.sessoes.every(s => s.duracao_total <= 180));
    const resumo = await cliente.callTool({ name: 'resumir_catalogo', arguments: {} });
    assert.equal(resumo.structuredContent.total, 160);
    const alternativas = await cliente.callTool({ name: 'sugerir_alternativas', arguments: { filtros: { genero: 'comédia', duracao_maxima: 70, idade_publico: 0 } } });
    assert.ok(alternativas.structuredContent.alternativas.length > 0);
    let intervaloRecusado = false;
    try { intervaloRecusado = (await cliente.callTool({ name: 'buscar_filmes', arguments: { duracao_minima: 120, duracao_maxima: 90 } })).isError === true; }
    catch { intervaloRecusado = true; }
    assert.equal(intervaloRecusado, true);
    // SDKs podem expressar validação como resultado isError ou erro de protocolo.
    let recusou = false;
    try { recusou = (await cliente.callTool({ name: 'buscar_filmes', arguments: { limite: 1000 } })).isError === true; }
    catch { recusou = true; }
    assert.equal(recusou, true);
  } finally { await cliente.close(); }
}
test('MCP real por stdio: descoberta, consulta, detalhes e validação', { timeout: 15000 }, async () => {
  await conferir(new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('../src/servidor-stdio.mjs', import.meta.url))], stderr: 'ignore' }));
});
test('MCP real HTTP e verificações de saúde, origem, host e tamanho', { timeout: 15000 }, async () => {
  const servico = await iniciarHttp({ port: 0, host: '127.0.0.1', log: () => {} });
  try {
    const base = servico.url.replace('/mcp', '');
    const saude = await fetch(`${base}/health`);
    assert.equal(saude.status, 200);
    assert.equal(saude.headers.get('cache-control'), 'no-store');
    assert.equal((await saude.json()).total_filmes, 160);
    assert.equal((await fetch(`${base}/nao-existe`)).status, 404);
    assert.equal((await fetch(servico.url, { headers: { Origin: 'https://invasor.example' } })).status, 403);
    const hostInvalido = await new Promise((resolve, reject) => {
      const req = request(servico.url, { headers: { Host: 'invasor.example' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
      req.on('error', reject); req.end();
    });
    assert.equal(hostInvalido, 403);
    const grande = await fetch(servico.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ texto: 'a'.repeat(17000) }) });
    assert.equal(grande.status, 413);
    await conferir(new StreamableHTTPClientTransport(new URL(servico.url)));
    await conferir(new StreamableHTTPClientTransport(new URL(servico.url)));
  } finally { await servico.close(); }
});
