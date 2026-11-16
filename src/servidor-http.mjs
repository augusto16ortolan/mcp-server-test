import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler, hostHeaderValidation } from '@modelcontextprotocol/node';
import { carregarCatalogo } from './catalogo.mjs';
import { criarServidor } from './ferramentas.mjs';

// Factory exportada permite testar em uma porta livre, sem iniciar ao importar.
export async function iniciarHttp({ port = Number(process.env.PORT || 3000), host = '0.0.0.0',
  filmes = carregarCatalogo(), log = console.error,
  allowedHosts = ['localhost', '127.0.0.1', '[::1]', process.env.RENDER_EXTERNAL_HOSTNAME, process.env.RAILWAY_PUBLIC_DOMAIN, ...(process.env.ALLOWED_HOSTS || '').split(',')].map(s => s?.trim()).filter(Boolean),
  allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
} = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT deve ser um inteiro entre 0 e 65535.');
  const handler = createMcpHandler(() => criarServidor(filmes, log), { maxRequestBodySize: 16384 });
  const nodeHandler = toNodeHandler(handler, { maxRequestBodySize: 16384, onerror: () => log('Falha no transporte HTTP MCP.') });
  const validarHost = hostHeaderValidation(allowedHosts);
  const json = (res, status, dados) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(dados));
  };
  const http = createServer((req, res) => {
    const caminho = req.url?.split('?')[0];
    // Health check não processa dados do cliente; funciona também no proxy interno do Render.
    if (caminho === '/health' && (req.method === 'GET' || req.method === 'HEAD')) {
      return json(res, 200, { status: 'ok', catalogo_carregado: true, total_filmes: filmes.length, filmes_reais: filmes.filter(f => f.tipo === 'real').length, filmes_ficticios: filmes.filter(f => f.tipo === 'ficticio').length, versao: '2.0.0' });
    }
    if (!validarHost(req, res)) return;
    if (req.headers.origin) {
      const locais = [`http://localhost:${http.address().port}`, `http://127.0.0.1:${http.address().port}`];
      if (![...locais, ...allowedOrigins].includes(req.headers.origin)) return json(res, 403, { erro: 'Origem não permitida.' });
    }
    if (caminho !== '/mcp') return json(res, 404, { erro: 'Use /mcp para MCP ou /health para verificar o serviço.' });
    res.setHeader('cache-control', 'no-store');
    void nodeHandler(req, res).catch(() => {
      log('Falha ao atender MCP.');
      if (!res.headersSent) json(res, 500, { erro: 'Erro interno.' });
      else res.end();
    });
  });
  http.requestTimeout = 15000;
  http.headersTimeout = 10000;
  await new Promise((resolve, reject) => { http.once('error', reject); http.listen(port, host, resolve); });
  return { http, url: `http://127.0.0.1:${http.address().port}/mcp`, async close() {
    await handler.close();
    await new Promise((resolve, reject) => { http.close(e => e ? reject(e) : resolve()); http.closeAllConnections(); });
  } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const servico = await iniciarHttp();
  console.error(`CineCatálogo HTTP pronto na porta ${servico.http.address().port}. Rotas: /mcp e /health.`);
  let encerrando = false;
  for (const sinal of ['SIGINT', 'SIGTERM']) process.once(sinal, async () => {
    if (encerrando) return;
    encerrando = true;
    await servico.close();
  });
}
