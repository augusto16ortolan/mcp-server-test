# Verificação da entrega

Data: 16/11/2026. Ambiente local: macOS, Node.js 24.14.1 e npm 11.19.0.

## Executado e observado

- Instalação das dependências oficiais com versões fixadas e lockfile.
- `npm install --ignore-scripts`: 17 pacotes instalados, auditoria sem vulnerabilidades reportadas naquele momento.
- `npm ci --ignore-scripts --offline --no-audit --no-fund`: instalação limpa pelo lockfile, usando o cache local, concluída.
- `npm test`: **19 testes aprovados**, sem testes ignorados.
- `npm run verificar`: descoberta das sete ferramentas e chamadas reais de busca, detalhes, comparação, planejamento, estatísticas e alternativas por stdio.
- Processo HTTP iniciado pela entrada `src/servidor-http.mjs`, saúde conferida e cliente externo do SDK executado contra sua porta local.
- Processo HTTP antigo encerrado por SIGTERM e versão 1.1.0 iniciada na porta 3000.
- `npm run verificar -- http://localhost:3000/mcp`: sete ferramentas verificadas no servidor atualizado.
- `GET http://localhost:3000/health`: `status: ok`, `catalogo_carregado: true`, `total_filmes: 60`.

Os testes cobrem 60 filmes, 48 disponíveis, filtros, fronteiras de duração e idade, paginação completa, busca vazia, ID inexistente, argumentos inválidos e chamadas reais nos dois transportes. As consultas avançadas cobrem busca sem acentos, listas OU/E, exclusões, intervalos inválidos, ordenação, idiomas e temas, comparação com IDs ausentes, sessões sem filtros explícitos, intervalos entre filmes, orçamento exato, estatísticas globais e alternativas com restrições preservadas. O teste HTTP também verifica 403 para host/origem recusados, 413 para corpo grande e duas conexões consecutivas independentes.

## Ainda depende de uma etapa externa

- Criação de repositório remoto e implantação no Render.
- Validação na infraestrutura do Render e atribuição da URL final.
- Cadastro e execução agendada no cron-job.org.
- Conexão e uso efetivo por um modelo na conta do professor, no Codex ou ChatGPT.

O cliente de teste usa MCP sem IA. Nenhuma configuração pessoal de MCP, serviço hospedado ou cron foi criada nesta entrega. `render.yaml` foi preparado conforme a referência oficial, mas não foi submetido ao provedor.
