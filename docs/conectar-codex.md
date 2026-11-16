# Conectar ao Codex

Escolha um dos modos. Se mantiver os dois cadastrados ao mesmo tempo, o assistente terá ferramentas duplicadas e a demonstração ficará ambígua. Nenhuma configuração pessoal do Codex foi alterada nesta entrega.

## Local por stdio

Após `npm ci --ignore-scripts`, abra um terminal na pasta do projeto e execute:

```bash
codex mcp add cinema -- node "$PWD/src/servidor-stdio.mjs"
codex mcp list
```

O comando grava o caminho absoluto da pasta atual. `node` precisa estar acessível ao aplicativo. Se o aplicativo de desktop não encontrar o Node, substitua `node` pelo caminho absoluto retornado por `command -v node`. O cliente inicia o processo; você não precisa manter `npm start` rodando para esse modo.

Reabra a sessão, confira as ferramentas e peça:

> Use o MCP cinema para listar os filtros. Depois filtre catalogo=ficticios e busque comédias disponíveis com até 110 minutos. Informe os IDs e não use outras fontes.

Observe a chamada e os registros. Somente a configuração aparecer em `codex mcp list` não prova que o aplicativo carregou o servidor. O suporte e o recarregamento no desktop devem ser verificados na sessão real.

## Remoto por HTTP

Depois de implantar e verificar no Render, remova a configuração local se estiver trocando o mesmo nome:

```bash
codex mcp remove cinema
codex mcp add cinema --url https://SEU-SERVICO.onrender.com/mcp
codex mcp list
```

Use a URL real e uma nova sessão. No modo remoto, o processo roda no Render. Para ensaio HTTP no computador, a URL é `http://localhost:3000/mcp` e `npm start` deve estar rodando.

## Verificação sem modelo

Se a configuração do aplicativo falhar, confirme primeiro o servidor:

```bash
npm run verificar
# Ou, com HTTP já rodando:
npm run verificar -- http://localhost:3000/mcp
```

O verificador prova comunicação MCP, não raciocínio de IA. O teste não registra o servidor automaticamente no Codex.

Referência: [OpenAI Docs MCP](https://developers.openai.com/learn/docs-mcp). CLI local conferida com `codex mcp add --help`. Interface e suporte podem variar por versão do aplicativo.
