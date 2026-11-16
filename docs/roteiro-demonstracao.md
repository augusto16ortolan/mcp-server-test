# Roteiro de demonstração — 15 a 25 minutos

Os filmes são fictícios. Os resultados abaixo foram calculados a partir do JSON entregue. A sequência escolhida pelo modelo pode variar: acompanhe as chamadas reais. Não use a resposta em linguagem natural como única prova da consulta.

## Preparação

Execute `npm test` e `npm run verificar`. Se usar Render, confira `/health`, depois `npm run verificar -- URL_REAL/mcp`. Selecione apenas uma conexão cinema no cliente de IA. Abra os arquivos de dados, ferramentas e transporte no editor para consulta rápida.

## 1. A necessidade da fonte

Pergunte: “Quais filmes existem no nosso catálogo?” Explique que um modelo não conhece antecipadamente esse arquivo específico. Mostre três registros do JSON, sem enviar o catálogo inteiro à conversa.

## 2. Descoberta de ferramentas

Execute `npm run verificar` ou observe a lista de ferramentas no cliente. Mostre nome, descrição e argumentos de `buscar_filmes`. O cliente de verificação usa MCP sem modelo.

## 3. Busca objetiva

Prompt: “Use o MCP cinema. Busque comédias disponíveis de até 110 minutos, com limite de cinco.”

Argumentos esperados: `{"genero":"comédia","duracao_maxima":110,"limite":5}`.

Resultado: total 4, nesta ordem:

| ID | Filme | Minutos |
|---|---|---:|
| FILME-002 | A Padaria das Segundas Chances | 89 |
| FILME-003 | O Síndico de Férias | 104 |
| FILME-001 | O Último Ônibus para Saturno | 98 |
| FILME-004 | Um Guarda-Chuva para Três | 82 |

O filme “Manual do Tio Desastrado” dura 96 minutos, mas está indisponível, portanto não aparece. “O Concurso de Nada” dura 112 minutos e também fica fora.

## 4. Filtros e paginação

Prompt: “Busque filmes leves, disponíveis, com até 90 minutos, para uma sessão cujo participante mais novo tem 10 anos. Mostre cinco opções.”

Argumentos: `{"clima":"leve","duracao_maxima":90,"idade_publico":10,"limite":5}`.

Total 7. Primeira página: FILME-013, FILME-017, FILME-002, FILME-048 e FILME-016. Próximo offset: 5. Explique a indicação etária didática e pergunte como buscar as duas opções restantes.

## 5. Detalhes e recomendação

Prompt: “Obtenha os detalhes de FILME-001 e explique para que sessão ele poderia ser uma opção.”

A ferramenta retorna a sinopse do ônibus interplanetário. O servidor fornece a ficha; o modelo formula a explicação. A resposta de busca é menor porque não carrega todas as sinopses.

## 6. Sem resultado e limites

Prompt: “Busque suspense com até 30 minutos e indicação etária de zero anos. Não mude os critérios.” Resultado: total 0.

Prompt: “Consulte FILME-999.” Resultado: `encontrado: false`.

Prompt: “Adicione o primeiro filme aos meus favoritos.” A versão não tem ferramenta de escrita. Não permita ao agente alterar arquivos do projeto como alternativa durante essa demonstração: o objetivo é observar os limites do MCP.

## 7. Consultas avançadas (extensão opcional de 10 minutos)

Prompt: “Compare FILME-001 e FILME-004 em duração, temas e indicação etária.” A diferença de duração é 16 minutos. Mostre que a IA organiza a explicação a partir das fichas.

Prompt: “Tenho 180 minutos para dois filmes leves e dez minutos de intervalo, com público a partir de dez anos. Monte três opções de sessão.” Observe `planejar_sessao`: o servidor calcula as combinações e o tempo total incluindo o intervalo.

Prompt: “Resuma o catálogo inteiro por gênero, incluindo indisponíveis.” Observe `resumir_catalogo`: 60 filmes, 48 disponíveis, 12 indisponíveis. A soma por gênero pode ultrapassar 60 porque há filmes com vários gêneros.

Prompt: “Quero comédia para idade zero com até 70 minutos. Se não houver, proponha até 20 minutos extras, explicando a mudança.” Observe `sugerir_alternativas`: FILME-004 exige mais 12 minutos e FILME-002 mais 19. As indicações etárias são preservadas.

Consulte [o guia de consultas avançadas](consultas-avancadas.md) para parâmetros, comandos e 15 perguntas. As novas fichas e pessoas são fictícias, assim como o catálogo original.

## 8. Local e remoto

Mostre que ferramentas e dados são iguais nos dois transportes. `/health` apenas verifica o serviço. O verificador executa protocolo MCP. Um chat usando a ferramenta mostra a etapa adicional da escolha pelo modelo.

## Contingência

Se Render estiver em repouso, espere a saúde responder e repita a consulta. Se não houver rede, use o verificador stdio com dependências já instaladas, identificando que não há IA nesse teste. Se houver internet mas o ChatGPT não oferecer conexão personalizada, use o Codex compatível.

## Arquivos para mostrar

Primeiro `dados/filmes.json`, depois `src/catalogo.mjs`, `src/ferramentas.mjs` e, por fim, o transporte. Evite iniciar a explicação pela infraestrutura: a pergunta e a fonte tornam a integração compreensível.
