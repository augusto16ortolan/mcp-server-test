# Conectar ao ChatGPT

Use o servidor hospedado e já testado. O endereço será `https://SEU-SERVICO.onrender.com/mcp`, substituindo o domínio pelo real. Não use `localhost` nesse fluxo de acesso remoto.

A documentação da OpenAI consultada em 16/11/2026 orienta, no ChatGPT pela web:

1. Acessar Plugins, selecionar o botão de adicionar e **Add custom MCP server**.
2. Informar nome “CineCatálogo”, descrição “Catálogo fictício de filmes em português para ensino” e a URL `/mcp`.
3. Configurar sem autenticação para este catálogo público anônimo. Não informe chaves OpenAI, senhas ou tokens: esta versão não precisa deles.
4. Revisar e concluir a conexão, instalar/selecionar a integração conforme a interface e abrir um novo chat.
5. Pedir explicitamente para usar o catálogo, conferir a chamada e comparar os resultados esperados do roteiro.

A disponibilidade do recurso depende da conta, das permissões e da interface. Se a opção não existir, consulte a documentação atual ou use o Codex. Esta entrega não comprova acesso na sua conta do ChatGPT.

Prompt de ensaio:

> Consulte o CineCatálogo. Liste as comédias disponíveis com até 110 minutos, com seus IDs. Depois obtenha a sinopse de FILME-001. Use apenas os registros retornados e identifique que são fictícios.

Ao alterar descrições ou adicionar ferramentas, atualize a conexão conforme a interface para que ela descubra as novas definições. Mudanças apenas nos filmes requerem novo deploy e uma nova consulta.

O servidor não possui widget ou interface própria e não precisa ser publicado em um diretório público para esta demonstração pessoal. Não adicione dados privados à versão anônima.

Fonte: [adicionar servidor MCP personalizado](https://developers.openai.com/api/docs/guides/custom-mcp-server).
