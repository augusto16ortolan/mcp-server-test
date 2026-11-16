# CineCatálogo MCP

Servidor didático de cinema com **60 filmes fictícios em português**, 48 disponíveis e 12 indisponíveis. Tem dez gêneros, sete climas, 14 temas, buscas combinadas, comparação de filmes, planejamento de sessões e estatísticas. As fichas incluem diretor, país, idiomas, avisos de conteúdo e coleções, todos fictícios. Não consulta plataformas de streaming, não grava dados e não chama uma API de IA.

## Começar no seu computador

Requer Node.js 24 (testado com 24.14.1) e npm. Abra o terminal nesta pasta:

```bash
npm ci --ignore-scripts
npm test
npm run verificar
```

O último comando inicia o servidor **stdio**, descobre as ferramentas e realiza consultas reais pelo MCP. Ele termina sozinho e **não utiliza um modelo de IA**.

Para testar HTTP, abra um terminal e mantenha o servidor rodando:

```bash
npm start
```

Em outro terminal, na mesma pasta:

```bash
curl http://localhost:3000/health
npm run verificar -- http://localhost:3000/mcp
```

A saúde retorna `status: ok` e `total_filmes: 60`. O verificador encontra quatro comédias disponíveis de até 110 minutos. Encerre o servidor HTTP com Ctrl+C.

## Consultas manuais com seus filtros

Com `npm start` rodando em outro terminal, execute nesta pasta:

```bash
npm run consultar -- listar_filtros
npm run consultar -- buscar_filmes '{"genero":"animação","duracao_maxima":90,"limite":10}'
npm run consultar -- obter_detalhes_filme '{"id":"FILME-013"}'
```

Use aspas simples em volta do JSON para preservar as aspas duplas internas no terminal. O destino padrão é `http://localhost:3000/mcp`. Para consultar o servidor hospedado, acrescente a URL real ao final:

```bash
npm run consultar -- buscar_filmes '{"genero":"comédia"}' https://SEU-SERVICO.onrender.com/mcp
```

O comando usa o cliente oficial MCP, não um modelo de IA. Ele permite observar os dados antes de pedir ao assistente que os interprete.

## Guias para os próximos passos

1. [Conectar ao Codex](docs/conectar-codex.md), local ou remoto.
2. [Hospedar no Render](docs/deploy-render.md).
3. [Configurar o cron-job.org](docs/cron-job.md).
4. [Conectar ao ChatGPT](docs/conectar-chatgpt.md).
5. [Roteiro de aula com resultados esperados](docs/roteiro-demonstracao.md).
6. [Solução de problemas](docs/solucao-de-problemas.md).
7. [Registro de verificação](docs/verificacao.md).
8. [Consultas avançadas: parâmetros, comandos e perguntas](docs/consultas-avancadas.md).

## Ferramentas

| Nome | Entrada | Resposta |
|---|---|---|
| `listar_filtros` | `{}` | Valores aceitos, idiomas, temas, coleções e totais |
| `buscar_filmes` | Filtros opcionais abaixo | Registros resumidos, total e próximo offset |
| `obter_detalhes_filme` | `{"id":"FILME-001"}` | Ficha completa com sinopse, ou `encontrado: false` |

| `comparar_filmes` | De dois a cinco IDs | Fichas lado a lado e diferença de duração |
| `planejar_sessao` | Tempo, quantidade, intervalo e filtros | Combinações que cabem no tempo disponível |
| `resumir_catalogo` | Filtros e agrupamento opcionais | Contagens e duração média de todos os resultados |
| `sugerir_alternativas` | Filtros e critérios que podem mudar | Propostas com cada alteração explicitada |

### Filtros de busca

| Parâmetro | Valores |
|---|---|
| `titulo`, `diretor`, `colecao` | Trecho do nome, ignorando acentos e maiúsculas |
| `genero`, `clima` | Um valor válido; preservam compatibilidade com a primeira versão |
| `generos`, `climas`, `temas` | Listas de valores retornados por `listar_filtros` |
| `modo_generos`, `modo_climas`, `modo_temas` | `qualquer` (OU, padrão) ou `todos` (E) dentro de cada lista |
| `excluir_generos`, `excluir_conteudos` | Elimina filmes que tenham qualquer item da lista |
| `duracao_minima`, `duracao_maxima` | Inteiros de 1 a 300 minutos, limites inclusivos |
| `ano`, `ano_minimo`, `ano_maximo` | Ano exato e/ou intervalo inclusivo, de 1900 a 2100 |
| `pais`, `idioma_original`, `audio`, `legenda` | Valor completo, ignorando acentos e maiúsculas |
| `idade_publico` | Inteiro de 0 a 18, idade da pessoa mais nova da sessão |
| `somente_disponiveis` | Booleano, padrão `true` na busca |
| `ordenar_por`, `ordem` | `titulo`, `duracao` ou `ano`; `asc` ou `desc` |
| `limite`, `offset` | De 1 a 10 resultados (padrão 5); deslocamento de 0 a 100000 (padrão 0) |

Filtros de campos diferentes se combinam por E. Dentro das listas, o modo seleciona OU ou E. Exclusões sempre prevalecem. Por exemplo, exigir e excluir comédia ao mesmo tempo retorna zero filmes. A ordenação padrão é título crescente, com desempate estável por título/ID.

A busca não inclui sinopse; consulte detalhes por ID. `proximo_offset: null` indica fim da lista. Lista vazia não é erro. Valores inválidos geram erro de validação. Consulte `listar_filtros` para usar os valores exatos dos campos enumerados, como `ficção científica`.

Exemplo de argumentos MCP (não é um corpo REST para enviar diretamente a `/mcp`):

```json
{"genero":"comédia","clima":"leve","duracao_maxima":110,"idade_publico":10,"limite":5}
```

O catálogo é inventado. A indicação etária é didática, não oficial. Disponibilidade refere-se apenas ao exercício. O servidor fornece dados; a recomendação em linguagem natural é responsabilidade do modelo e do aplicativo que o utiliza.

## Arquitetura e leitura do código

- `dados/filmes.json`: os 60 registros, editáveis e versionados.
- `src/catalogo.mjs`: consultas, comparação, combinações de sessões e estatísticas sem transporte.
- `src/schemas.mjs`: campos, limites e validações de entrada e do catálogo.
- `src/ferramentas.mjs`: descrições e registro das sete ferramentas MCP.
- `src/servidor-stdio.mjs`: processo local, logs em stderr.
- `src/servidor-http.mjs`: Streamable HTTP sem estado, `/mcp` e `/health`.
- `scripts/verificar-mcp.mjs`: cliente real do SDK, sem IA.
- `tests/`: regras do catálogo e integrações stdio/HTTP.

O servidor lê e valida o catálogo uma vez ao iniciar. Para mudar filmes, edite o JSON e reinicie; no Render, publique uma nova revisão. Os 60 registros são a base dos testes didáticos: ao ampliar o catálogo, atualize as expectativas correspondentes.

## Configuração

`PORT` tem padrão 3000 localmente. O Render define a porta e seu hostname automaticamente. `ALLOWED_HOSTS` permite hostnames adicionais, separados por vírgula, para domínio próprio. `ALLOWED_ORIGINS` permite origens exatas adicionais, como `https://seu-cliente.example`, somente se necessário. Chamadas sem Origin, comuns entre servidores, são aceitas. Não há CORS aberto para páginas arbitrárias.

O arquivo `.env.example` é uma referência. O programa não carrega `.env` automaticamente. Para usar um arquivo local, copie-o para `.env` e execute:

```bash
node --env-file=.env src/servidor-http.mjs
```

No Render, configure as variáveis no painel. Não é necessária chave OpenAI, token GitHub ou chave de filmes no processo.

## Escopo de exposição

Este é um catálogo público, anônimo e somente leitura. Depois de hospedado, qualquer pessoa com a URL pode consultá-lo. Os limites de entrada, validações de Host/Origin e tamanho máximo de corpo (16 KiB) não substituem autenticação. Não inclua dados privados nem ações de escrita sem revisar esse escopo. Logs mostram ferramentas e contagens, sem armazenar conversas.

Os testes locais não provam disponibilidade no Render ou acesso por sua conta do ChatGPT. Esses passos estão preparados nos guias e precisam ser executados após a implantação.
