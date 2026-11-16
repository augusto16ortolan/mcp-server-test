# CineCatálogo MCP

Servidor MCP em português com **100 filmes reais do Wikidata e 60 filmes fictícios para demonstração**. Oferece sete ferramentas: busca com filtros, fichas com elenco/direção, comparação, planejamento de sessões, estatísticas e alternativas explicadas. Os dados ficam no projeto; consultas não dependem de uma API externa nem usam chave de IA.

**Servidor publicado:** `https://cinecatalogo-mcp.onrender.com/mcp`

**Saúde:** `https://cinecatalogo-mcp.onrender.com/health`

## Filmes reais e limites dos dados

Use `catalogo: "reais"`, `"ficticios"` ou `"todos"` (padrão). Cada resultado informa seu `tipo`. IDs antigos `FILME-001` continuam funcionando; os reais usam IDs estáveis como `REAL-Q25188` (A Origem).

As fichas reais incluem título original e alternativos, ano, gêneros, duração, diretores, países, idiomas originais, créditos de atuação/voz, avaliações quando registradas na fonte e imagens quando possuem licença identificada. O catálogo foi selecionado para incluir cinema brasileiro, animações, clássicos e diferentes gêneros.

- Notas são **IMDb via Wikidata, escala 0–10**, com a data registrada pela fonte e a data da importação. Não representam consulta atual ao IMDb. Ausência de nota é `null`.
- Imagem relacionada não é necessariamente pôster. `poster_url` só existe quando o Wikidata identifica o arquivo como pôster. `imagem` inclui autor, licença e página do arquivo.
- Classificação etária brasileira, avisos de conteúdo, sinopses, dublagens e legendas não foram inventados. Campos sem fonte ficam nulos ou vazios.
- `disponivel` significa incluído no catálogo local para o exercício. Não indica streaming, ingresso ou licença para exibir um filme.
- Filtros por idade, conteúdo, áudio, duração ou nota não aceitam informação desconhecida como correspondência.

Veja [origem, cobertura, atualização e exemplos dos filmes reais](docs/filmes-reais.md).

## Executar localmente

Requer Node.js 24 e npm:

```bash
npm ci --ignore-scripts
npm test
npm run verificar
```

O verificador inicia um servidor stdio e chama as sete ferramentas usando o SDK MCP, sem modelo de IA. Para HTTP:

```bash
npm start
```

Em outro terminal, na mesma pasta:

```bash
curl http://localhost:3000/health
npm run verificar -- http://localhost:3000/mcp
npm run consultar -- buscar_filmes '{"catalogo":"reais","diretor":"Christopher Nolan","ordenar_por":"nota","ordem":"desc"}'
npm run consultar -- obter_detalhes_filme '{"id":"REAL-Q25188"}'
npm run consultar -- planejar_sessao '{"tempo_disponivel":300,"quantidade_filmes":2,"intervalo_minutos":10,"filtros":{"catalogo":"reais","genero":"ficção científica"}}'
```

Para usar a hospedagem, acrescente `https://cinecatalogo-mcp.onrender.com/mcp` ao final do comando `consultar`, ou passe essa URL ao `verificar`. Encerre o servidor local com Ctrl+C.

## Ferramentas

| Ferramenta | Uso |
|---|---|
| `listar_filtros` | Valores disponíveis, diretores, gêneros, idiomas e cobertura dos dados |
| `buscar_filmes` | Filtros combinados, ordenação, até dez filmes por página |
| `obter_detalhes_filme` | Ficha completa, elenco, fontes, avaliação, imagem e licença |
| `comparar_filmes` | De dois a cinco IDs, com diferenças de duração quando conhecidas |
| `planejar_sessao` | De um a três filmes, duração total e intervalos dentro do orçamento |
| `resumir_catalogo` | Estatísticas sobre todos os resultados, sem paginação |
| `sugerir_alternativas` | Propostas explícitas de mudança na duração máxima ou nos gêneros exigidos |

Todas são somente leitura. A IA explica as recomendações; o servidor filtra, calcula e fornece os dados.

## Filtros

| Parâmetro | Uso |
|---|---|
| `catalogo` | `reais`, `ficticios` ou `todos` (padrão) |
| `titulo` | Trecho do título exibido, original ou alternativo |
| `diretor`, `ator` | Trecho do nome; elenco pode ser incompleto |
| `genero`, `generos`, `excluir_generos` | Inclusões e exclusões; descubra valores em `listar_filtros` |
| `modo_generos` | `qualquer` (OU) ou `todos` (E) dentro da lista |
| `duracao_minima`, `duracao_maxima` | De 1 a 600 minutos, inclusivos |
| `ano`, `ano_minimo`, `ano_maximo` | Ano exato ou intervalo de 1888 a 2100 |
| `pais`, `idioma_original` | Considera todos os países/idiomas informados |
| `nota_minima`, `votos_minimos` | Nota de 0 a 10 e número mínimo de votos da mesma avaliação |
| `com_imagem`, `com_poster` | Booleanos; imagens relacionadas e pôsteres são distintos |
| `idade_publico` | Idade de 0 a 18; indicação desconhecida é excluída |
| `clima`, `climas`, `modo_climas` | Climas editoriais existentes nos exemplos fictícios |
| `temas`, `modo_temas` | Temas editoriais existentes nos exemplos fictícios |
| `excluir_conteudos` | Também exclui filmes cujos avisos são desconhecidos |
| `audio`, `legenda`, `colecao` | Dados disponíveis nos exemplos fictícios |
| `somente_disponiveis` | Padrão `true`; disponibilidade apenas no catálogo |
| `ordenar_por`, `ordem` | `titulo`, `duracao`, `ano`, `nota` ou `votos`; `asc` ou `desc` |
| `limite`, `offset` | De 1 a 10 resultados (padrão 5); início da página (padrão 0) |

Filtros de campos diferentes se combinam por E. Listas aceitam OU/E e exclusões prevalecem. Nomes e gêneros ignoram acentos e maiúsculas; país/idioma exigem o nome completo. Valores desconhecidos ficam no fim de uma ordenação. Gênero sem correspondência retorna zero resultados. Parâmetros desconhecidos ou intervalos invertidos geram erro.

A busca omite o elenco completo e as notas de importação; consulte detalhes por ID. `proximo_offset: null` indica o fim. `resumir_catalogo` inclui indisponíveis por padrão e calcula médias somente sobre valores conhecidos.

## Atualizar os 100 filmes reais

A cópia já está incluída; **não precisa importar para rodar ou publicar**.

```bash
npm run importar:wikidata
# Consultar novamente as fontes, ignorando o cache local:
npm run importar:wikidata -- --atualizar
npm test
```

O importador usa os IDs fixados em `dados/selecao-reais.json`, consulta Wikidata e metadados de licença do Wikimedia Commons, valida o conjunto inteiro e só então substitui `dados/filmes-reais.json`. Falhas preservam a versão anterior. `.cache/` não vai para o GitHub. No Render, os dados atualizados chegam por commit/deploy; não dependa do disco temporário para persistir atualizações.

## Estrutura

- `dados/filmes.json`: 60 exemplos fictícios preservados.
- `dados/filmes-reais.json`: 100 fichas reais com fonte e data.
- `dados/selecao-reais.json`: seleção auditável por ID Wikidata e IMDb.
- `scripts/importar-wikidata.mjs` e `scripts/lib/`: importação, interpretação de notas, gêneros e imagens.
- `src/schemas.mjs`: validação das fichas e argumentos.
- `src/catalogo.mjs`: consultas e cálculos independentes de transporte.
- `src/ferramentas.mjs`: registro das sete ferramentas.
- `src/servidor-stdio.mjs` e `src/servidor-http.mjs`: transportes local e remoto.
- `tests/`: regressões dos exemplos fictícios, regras dos reais, importador e MCP real nos dois transportes.

## Hospedar e conectar

1. [Render](docs/deploy-render.md).
2. [cron-job.org](docs/cron-job.md).
3. [ChatGPT](docs/conectar-chatgpt.md).
4. [Codex](docs/conectar-codex.md).
5. [Perguntas e consultas avançadas](docs/consultas-avancadas.md).
6. [Roteiro de aula](docs/roteiro-demonstracao.md).
7. [Solução de problemas](docs/solucao-de-problemas.md).
8. [Verificação](docs/verificacao.md).

`PORT` tem padrão 3000; Render/Railway fornecem a porta do serviço. Hostnames públicos fornecidos em `RENDER_EXTERNAL_HOSTNAME` e `RAILWAY_PUBLIC_DOMAIN` são reconhecidos. Domínios adicionais vão em `ALLOWED_HOSTS`; origens de navegador adicionais em `ALLOWED_ORIGINS`. O `.env.example` é referência; use `node --env-file=.env src/servidor-http.mjs` se precisar carregar um `.env` local.

O servidor é público e anônimo, aceita corpo de até 16 KiB e não grava dados por MCP. Não inclua dados privados. A importação roda como comando administrativo local, não como ferramenta exposta à IA.

## Fontes e atribuição

Metadados reais: [Wikidata, CC0](https://www.wikidata.org/wiki/Wikidata:Data_access). Cada ficha registra entidade, revisão e propriedades utilizadas. Imagens: [Wikimedia Commons](https://commons.wikimedia.org/), com licença individual em cada ficha. Ao exibir uma imagem, inclua os créditos e o link da licença. O programa não baixa ou republica os arquivos de imagem.
