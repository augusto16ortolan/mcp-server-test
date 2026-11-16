# Verificação da versão 2.0.0

Data: 16/11/2026. Ambiente local: macOS, Node.js 24.14.1.

## Executado e observado

- Importação pela API pública Wikidata, sem chave, com metadados de imagem do Wikimedia Commons.
- 100 filmes reais únicos, todos com direção, duração e créditos de atuação/voz.
- 67 avaliações históricas IMDb via Wikidata; 30 imagens licenciadas, sendo dois pôsteres.
- Preservados os 60 filmes fictícios e seus IDs. Total: 160 filmes, 148 incluídos como disponíveis no catálogo local.
- `npm run importar:wikidata`: reconstrução usando cache local concluída, com validação antes da gravação.
- `npm test`: **28 testes aprovados**, sem testes ignorados.
- `npm run verificar`: descoberta e chamadas das sete ferramentas por stdio; busca real por diretor, ficha de A Origem com elenco e fonte e exemplos fictícios preservados.
- Integração HTTP com SDK MCP: testes em porta temporária, duas conexões independentes, rejeição de Host/Origin inválidos e limite de corpo.

## Casos verificados

Filtros por ator, título original/alternativo, diretor, múltiplos países/idiomas, nota e votos da mesma avaliação; paginação e ordenação; dados desconhecidos excluídos dos filtros exigentes; comparação com duração ausente; sessões sem repetição e dentro do orçamento; contagem de todas as combinações sem guardar todas em memória; alternativas preservando catálogo e ator; classificação desconhecida não considerada infantil; identificação de anime como animação; imagem relacionada distinta de pôster; parser de notas que não mistura percentuais ou fontes.

A origem dos registros foi conferida por IDs Wikidata e IMDb. Campos sem informação não foram preenchidos com estimativas. O verificador do SDK não usa um modelo de IA.

## Reproduzir a validação da hospedagem

A implantação anterior no Render já foi validada neste projeto. Para conferir a revisão 2.0.0 depois do deploy:

```bash
curl --fail --max-time 60 https://cinecatalogo-mcp.onrender.com/health
npm run verificar -- https://cinecatalogo-mcp.onrender.com/mcp
```

A saúde deve informar `versao: "2.0.0"`, `total_filmes: 160`, `filmes_reais: 100` e `filmes_ficticios: 60`. O verificador deve concluir também as consultas de filmes reais. A conexão do ChatGPT precisa atualizar a descoberta dos filtros; o cadastro do cron continua apontando para `/health`.
