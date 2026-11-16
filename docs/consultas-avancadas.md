# Consultas avançadas e perguntas para a aula

O servidor tem sete ferramentas e 60 filmes fictícios. Diretores, países, idiomas, coleções e avisos também são dados didáticos; não são informações sobre filmes reais. Não há consulta a streaming, favoritos persistentes ou notas de espectadores.

## Como combinar filtros

Comece com `listar_filtros` para descobrir valores disponíveis. Campos diferentes se combinam por E. Nas listas de gêneros, climas e temas, `qualquer` aceita pelo menos um valor e `todos` exige todos. As exclusões são aplicadas em ambos os modos. Os limites de duração e ano são inclusivos.

Exemplo: `generos: ["comédia", "aventura"]` com `modo_generos: "qualquer"` aceita comédia OU aventura. Com `todos`, exige um filme que tenha ambos. Adicionar `idade_publico: 10` restringe os resultados à indicação didática de até dez anos. Se não houver correspondência, o servidor retorna lista vazia.

Título, diretor e coleção aceitam parte do nome sem distinção de acentos ou maiúsculas. País e idiomas também ignoram acentos/caixa, mas exigem o valor completo. Os campos enumerados, como gêneros e temas, exigem os valores exatos de `listar_filtros`.

Com o servidor HTTP rodando (`npm start`), execute na pasta do projeto:

```bash
npm run consultar -- listar_filtros
npm run consultar -- buscar_filmes '{"titulo":"onibus"}'
npm run consultar -- buscar_filmes '{"generos":["comédia","ficção científica"],"modo_generos":"todos"}'
npm run consultar -- buscar_filmes '{"temas":["amizade"],"audio":"português","duracao_minima":70,"duracao_maxima":100,"ano_minimo":2000,"ano_maximo":2020,"excluir_conteudos":["cenas de tensão"],"ordenar_por":"duracao","ordem":"asc","limite":10}'
```

A busca retorna até dez filmes por página. Para continuar, repita os mesmos filtros e a mesma ordenação usando o `proximo_offset` retornado como novo `offset`.

## Comparar opções

`comparar_filmes` aceita de dois a cinco IDs distintos, mantém a ordem solicitada e retorna as fichas completas. A diferença de duração é a maior duração menos a menor. IDs inexistentes aparecem em `ids_nao_encontrados`; a comparação fica marcada como incompleta.

```bash
npm run consultar -- comparar_filmes '{"ids":["FILME-001","FILME-004"]}'
```

Resultado esperado: 98 e 82 minutos; diferença de 16 minutos. O modelo pode montar uma tabela e explicar vantagens de cada opção com base nas fichas. O servidor não atribui uma nota de qualidade.

## Planejar uma sessão

`planejar_sessao` considera todos os candidatos filtrados, sem depender de uma página da busca. Aceita de um a três filmes, sem repetição, e de zero a 60 minutos por intervalo. O tempo total permitido vai de um a 1000 minutos. Por padrão, usa dois filmes, dez minutos entre eles e retorna até três combinações (máximo cinco).

```bash
npm run consultar -- planejar_sessao '{"tempo_disponivel":180,"quantidade_filmes":2,"intervalo_minutos":10,"filtros":{"clima":"leve","idade_publico":10},"limite":3}'
```

Para dois filmes, conta um intervalo; para três, dois. A soma dos filmes e intervalos nunca ultrapassa o orçamento. As opções priorizam menor tempo restante, com desempate por IDs. Não significa que a primeira seja o melhor filme artisticamente. A ordem dos filmes na resposta não é uma ordem narrativa de coleção.

As sessões usam apenas filmes disponíveis; `somente_disponiveis: false` é recusado. Quando não existe combinação, retorna zero opções e mantém os critérios. O planejamento é uma consulta: não reserva sala, não salva agenda e não muda disponibilidade.

## Estatísticas do catálogo

`resumir_catalogo` calcula sobre todos os filmes que atendem aos filtros, sem paginação. Por padrão inclui disponíveis e indisponíveis, diferentemente da busca. Retorna total, disponibilidade, média, mínimo e máximo de duração. Uma base vazia retorna duração `null`, não zero.

```bash
npm run consultar -- resumir_catalogo '{}'
npm run consultar -- resumir_catalogo '{"agrupar_por":"pais","filtros":{"somente_disponiveis":true}}'
npm run consultar -- resumir_catalogo '{"agrupar_por":"idade","filtros":{"genero":"animação"}}'
```

Sem filtros: 60 filmes, 48 disponíveis e 12 indisponíveis. Agrupamentos aceitos: `genero`, `clima`, `idade`, `pais` e `disponibilidade`. Um filme pode ter vários gêneros/climas, então a soma desses grupos pode ultrapassar o total de filmes.

## Alternativas quando não há resultados

`sugerir_alternativas` procura primeiro correspondências exatas. Se encontrar, retorna `filmes_exatos` e não flexibiliza nada. Se não encontrar, pode ampliar a duração máxima e/ou remover a exigência dos gêneros de inclusão. Só considera os campos listados em `flexibilizar`.

```bash
npm run consultar -- sugerir_alternativas '{"filtros":{"genero":"comédia","duracao_maxima":70,"idade_publico":0},"flexibilizar":["duracao_maxima"],"acrescimo_maximo_minutos":20}'
```

Resultado esperado: nenhuma correspondência exata; propostas FILME-004 (82 minutos, acréscimo de 12) e FILME-002 (89 minutos, acréscimo de 19). Cada resultado informa `mudancas`, com o valor original e o proposto.

O padrão é flexibilizar somente `duracao_maxima`, em até 30 minutos. O acréscimo pode ser configurado de um a 60 minutos. `flexibilizar: ["generos"]` permite remover a exigência de `genero`/`generos`. Idade, disponibilidade, gêneros excluídos, conteúdo excluído e todos os demais filtros são preservados. As propostas são ordenadas por menos alterações, menor aumento de duração e título. O limite padrão é três, máximo cinco. Nenhuma mudança é salva.

## Perguntas para usar com o modelo

Comece com “Use o MCP cinema e responda somente com dados do nosso catálogo”. A escolha e a sequência das ferramentas podem variar por modelo; observe as chamadas reais.

1. Quais gêneros, temas, idiomas e coleções existem no catálogo?
2. Procure um filme que tenha “onibus” no título, mesmo sem acento.
3. Quais filmes são comédia ou ficção científica? E quais têm os dois gêneros?
4. Quero filmes leves de até 100 minutos, sem suspense e sem cenas de tensão.
5. Mostre filmes com áudio em português sobre amizade, ordenados do mais curto para o mais longo.
6. Liste filmes de 2010 a 2020. Mostre os mais recentes primeiro.
7. Quais filmes brasileiros estão disponíveis? Informe diretor e idioma original.
8. Mostre os filmes da coleção Viagens Impossíveis, incluindo indisponíveis, e ordene pela posição na coleção.
9. Compare FILME-001 e FILME-004 em duração, temas, indicação etária e sinopse.
10. Tenho três horas para dois filmes leves e dez minutos de intervalo. O participante mais novo tem dez anos. Quais combinações cabem?
11. Monte uma sessão de três filmes em cinco horas, com quinze minutos entre eles.
12. Quantos filmes existem por gênero e quantos estão disponíveis? Explique se a soma por gênero ultrapassar o total.
13. Qual é a duração média das animações, incluindo as indisponíveis?
14. Busque comédias para idade zero, de até 70 minutos. Se não houver, proponha opções até 20 minutos mais longas e explique cada alteração.
15. Mostre a próxima página mantendo os filtros e a ordenação da consulta anterior.

Na pergunta sobre ordem da coleção, a ficha fornece `colecao.ordem`; o modelo organiza a tabela. Na sessão, o servidor faz os cálculos. Na recomendação, o modelo explica a escolha usando os resultados. Essa distinção ajuda a mostrar em aula o que cabe ao MCP e o que cabe à IA.

## Depois de atualizar o servidor

Reinicie o processo local para carregar o código e o JSON novos. No Render, publique a revisão atualizada e execute o verificador contra a URL pública. O endpoint continua `/mcp` e a saúde continua `/health`; a rotina de cron não muda. Se o cliente ainda mostrar apenas três ferramentas, atualize a descoberta/reconecte a integração e confirme a lista de sete ferramentas.
