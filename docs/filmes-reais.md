# Catálogo de filmes reais

## O que foi implementado

A versão 2.0 mantém os 60 exemplos fictícios e adiciona 100 filmes reais. A busca padrão consulta ambos; use `catalogo: "reais"` ou `"ficticios"` para separar. A fonte dos metadados reais é Wikidata, sem chave de API. A seleção cobre filmes de diferentes épocas, animações, cinema brasileiro e internacional; não é uma lista dos cem melhores filmes.

As fichas são consultadas localmente durante as chamadas MCP. O importador acessa a internet somente quando executado pelo mantenedor. Os 100 IDs Wikidata e IMDb ficam fixados no manifesto; um título igual não é suficiente para identificar uma obra.

## Cobertura da importação entregue

- 100 filmes reais, todos com duração, direção e créditos de atuação/voz.
- 67 com avaliação IMDb registrada no Wikidata; 33 sem avaliação.
- 30 com imagem licenciada; 70 sem imagem.
- Das 30 imagens, 2 são pôsteres identificados como tal (O Garoto e Casablanca); 28 são imagens relacionadas.
- Os 60 filmes fictícios continuam disponíveis separadamente.

Essas contagens descrevem o snapshot entregue e podem mudar após uma atualização da fonte. `listar_filtros` e `resumir_catalogo` mostram a cobertura efetiva do servidor.

## Como interpretar os campos

| Campo | Origem e significado |
|---|---|
| `titulo`, `titulos_alternativos` | Rótulos/aliases do Wikidata; prioriza português brasileiro |
| `titulo_original` | P1476, com fallback ao rótulo da entidade |
| `ano` | Primeiro ano de lançamento informado em P577; pode diferir da estreia brasileira |
| `duracao_minutos` | P2047 em minutos, priorizando declarações preferidas válidas; versões podem diferir |
| `diretores`, `elenco` | P57, P161 e P725; créditos de atuação e voz diferenciados |
| `personagens` | Qualificador P453 quando informado |
| `paises`, `idiomas_originais` | P495 e P364; não representam dublagem ou legendas disponíveis |
| `generos` | Taxonomia em português derivada de P136 e, para animação, P31 |
| `generos_originais` | Rótulos originais de P136 preservados para auditoria |
| `avaliacao` | Nota IMDb /10 registrada em P444 com emissor P447; outras escalas são ignoradas |
| `poster_url` | Apenas P3383, após conferir a licença no Commons |
| `imagem` | Pôster ou imagem relacionada P18, com tipo, autor, licença e página do arquivo |
| `fonte` | Entidade, revisão, momento da consulta e propriedades de origem |

A fonte pode não fornecer rótulos portugueses, elenco completo ou personagens. Nesses casos, mantemos os dados disponíveis e não criamos pessoas ou traduções factuais sem fonte. Elenco é limitado aos primeiros 20 créditos da fonte, sem promessa de protagonismo nem de idioma da dublagem.

## Notas: histórico, fonte e escala

`avaliacao.nota` é uma nota IMDb de zero a dez **registrada no Wikidata**, não uma consulta direta ou atual ao IMDb. `data_avaliacao` preserva a data da declaração (pode ser só ano ou ano/mês); `fonte.consultado_em` indica quando o Wikidata foi consultado. São datas diferentes.

Se houver várias declarações elegíveis, a importação escolhe a que tem a data mais recente. Declarações depreciadas são ignoradas. `votos` corresponde à mesma declaração, quando informado. Não convertemos percentual de aprovação do Rotten Tomatoes em uma nota equivalente. Nenhum dado ausente é substituído por zero.

## Imagens: nem toda imagem é um pôster

P3383 identifica pôsteres; P18 pode conter fotografia do elenco, cena ou outra imagem relacionada. A busca `com_poster: true` exige o primeiro caso. `com_imagem: true` aceita ambos.

A API do Commons fornece a URL e os metadados. O importador só aceita arquivos com licença explícita reconhecida, preservando autor, crédito, página do arquivo e URL da licença quando fornecida. Dados CC0 do Wikidata não tornam as imagens CC0: cada arquivo tem sua licença. A disponibilidade da URL e a renderização dependem do provedor e do cliente MCP.

## Dados desconhecidos e planejamento

Não importamos classificação etária brasileira, avisos de conteúdo, áudio dublado, legendas ou sinopse de outras fontes. Nos reais, esses campos permanecem desconhecidos. `descricao` é uma descrição curta da entidade, não uma sinopse.

Ao pedir filmes para uma criança ou sem determinado conteúdo, uma ficha desconhecida não passa no filtro. Uma animação não é automaticamente infantil. `clima` e `temas` não foram inferidos a partir do título. Por isso, consultas por clima/idade podem retornar apenas exemplos fictícios quando `catalogo` não for especificado.

Todos os reais foram incluídos no acervo do exercício (`disponivel: true`). Isso não informa onde assistir nem dá autorização de exibição. O planejador considera apenas fichas com duração conhecida e contabiliza os intervalos. Conta todas as combinações, mas mantém apenas as melhores solicitadas em memória.

## Exemplos por terminal

Com HTTP local rodando:

```bash
npm run consultar -- buscar_filmes '{"catalogo":"reais","ator":"Tom Hanks","ordenar_por":"ano","ordem":"desc"}'
npm run consultar -- buscar_filmes '{"catalogo":"reais","diretor":"Christopher Nolan","nota_minima":8,"ordenar_por":"nota","ordem":"desc"}'
npm run consultar -- buscar_filmes '{"catalogo":"reais","genero":"animação","duracao_maxima":100}'
npm run consultar -- buscar_filmes '{"catalogo":"reais","pais":"Brasil"}'
npm run consultar -- buscar_filmes '{"catalogo":"reais","com_poster":true}'
npm run consultar -- obter_detalhes_filme '{"id":"REAL-Q25188"}'
npm run consultar -- comparar_filmes '{"ids":["REAL-Q25188","REAL-Q83495"]}'
npm run consultar -- planejar_sessao '{"tempo_disponivel":300,"quantidade_filmes":2,"intervalo_minutos":10,"filtros":{"catalogo":"reais","genero":"ficção científica"}}'
npm run consultar -- resumir_catalogo '{"filtros":{"catalogo":"reais"},"agrupar_por":"pais"}'
```

Para usar o Render, acrescente `https://cinecatalogo-mcp.onrender.com/mcp` ao final. Os comandos não utilizam IA.

## Perguntas para o ChatGPT

Selecione o CineCatálogo e peça explicitamente o catálogo real:

1. Liste os filmes reais com Tom Hanks. Diferencie atuação e voz quando a ficha informar.
2. Quais filmes reais de Christopher Nolan têm nota registrada de pelo menos oito? Informe fonte e data da nota.
3. Busque animações reais de até cem minutos. Não suponha classificação infantil.
4. Mostre cinco filmes brasileiros e seus diretores.
5. Compare A Origem e Matrix: elenco, diretor, duração e avaliações registradas.
6. Monte uma sessão com dois filmes de ficção científica em cinco horas, incluindo dez minutos de intervalo.
7. Quais filmes reais têm pôster? Mostre as imagens disponíveis com créditos e licença.
8. Quantos filmes reais têm avaliação ou imagem? Quantos não possuem esses dados?
9. Procure “Um Sonho de Liberdade” também entre os títulos alternativos.
10. Busque os filmes reais com maior nota, exigindo pelo menos dez mil votos.

## Atualização reproduzível

Execute `npm run importar:wikidata`. Sem `--atualizar`, o script reutiliza respostas em `.cache/wikidata`. Com `--atualizar`, busca novamente as fontes. Há consultas em lote, pausas, timeout e tentativas limitadas para falhas temporárias. A revisão completa de cada ficha fica registrada.

A validação ocorre antes da substituição atômica do JSON. Se uma fonte falhar ou a seleção não resultar em cem filmes únicos válidos, o arquivo anterior é preservado. Depois de atualizar, execute `npm test` e `npm run verificar`, revise o diff e publique a nova revisão no Render. O processo já iniciado precisa reiniciar para carregar os dados novos.

Os identificadores `tmdb` foram preservados quando informados no Wikidata, permitindo um enriquecimento futuro. **Esta versão não chama o TMDB e não precisa de token.** Uma futura importação deve preservar fonte/data de cada campo e não sobrescrever avaliações IMDb como se fossem notas do TMDB.

## Fontes técnicas

- [Acesso e licença dos dados Wikidata](https://www.wikidata.org/wiki/Wikidata:Data_access).
- [P444: avaliações](https://www.wikidata.org/wiki/Property:P444).
- [P3383: pôster, distinto de P18](https://www.wikidata.org/wiki/Property:P3383).
- [Metadados de imagem e licença no Commons](https://www.mediawiki.org/wiki/API:Imageinfo).
