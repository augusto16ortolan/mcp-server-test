import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const [nome, json = '{}', destino = 'http://localhost:3000/mcp'] = process.argv.slice(2);
const nomes = ['buscar_filmes', 'comparar_filmes', 'listar_filtros', 'obter_detalhes_filme', 'planejar_sessao', 'resumir_catalogo', 'sugerir_alternativas'];
if (!nomes.includes(nome)) {
  console.error('Uso: npm run consultar -- FERRAMENTA \'{"filtro":"valor"}\' [URL_MCP]');
  console.error(`Ferramentas: ${nomes.join(', ')}`);
  process.exitCode = 1;
} else {
  const cliente = new Client({ name: 'consulta-manual-cinema', version: '1.0.0' });
  try {
    const argumentos = JSON.parse(json);
    const url = new URL(destino);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use uma URL HTTP ou HTTPS.');
    await cliente.connect(new StreamableHTTPClientTransport(url));
    const resultado = await cliente.callTool({ name: nome, arguments: argumentos });
    console.log(JSON.stringify(resultado.structuredContent ?? resultado.content, null, 2));
    if (resultado.isError) process.exitCode = 1;
  } catch (erro) {
    console.error(`Não foi possível consultar: ${erro.message}`);
    process.exitCode = 1;
  } finally { await cliente.close(); }
}
