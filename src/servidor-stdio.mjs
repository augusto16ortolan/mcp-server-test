import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { carregarCatalogo } from './catalogo.mjs';
import { criarServidor } from './ferramentas.mjs';
const filmes = carregarCatalogo();
const handle = serveStdio(() => criarServidor(filmes));
console.error('CineCatálogo pronto por stdio. Aguardando cliente MCP.');
for (const sinal of ['SIGINT', 'SIGTERM']) process.once(sinal, () => void handle.close());
