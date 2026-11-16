# Solução de problemas

| Sintoma | Conferência e ação |
|---|---|
| `node` não encontrado | Instale Node 24 e reabra o terminal/aplicativo. No Codex, use o caminho absoluto do executável se necessário. |
| Dependência não encontrada | Execute `npm ci --ignore-scripts` na pasta com `package.json`. |
| `npm run start:stdio` parece parado | É normal: aguarda um cliente. Use `npm run verificar` para iniciar e chamar automaticamente. |
| HTTP 405 abrindo `/mcp` | Um GET de navegador não é uma consulta MCP. Use o verificador ou cliente compatível. |
| `/health` funciona, mas MCP não | Execute o verificador contra `/mcp` e examine erros de protocolo/host. Saúde não testa ferramentas. |
| HTTP 403 no Render | Confira `RENDER_EXTERNAL_HOSTNAME`. Em domínio próprio, configure `ALLOWED_HOSTS` sem esquema, porta ou caminho. |
| Origin bloqueada | Clientes servidor-a-servidor normalmente não enviam Origin. Para navegador autorizado, configure a origem exata em `ALLOWED_ORIGINS`. Isso não implementa CORS aberto. |
| HTTP 413 | O corpo ultrapassou 16 KiB. As consultas deste exercício precisam apenas de pequenos argumentos JSON. |
| Tempo esgotado no primeiro acesso | Desperte o Render por `/health`, aguarde e tente de novo. O cron pode expirar antes de o serviço acordar. |
| Nenhum filme retornado | Confira filtros e disponibilidade. O servidor combina todos os critérios e não os relaxa. |
| Gênero recusado | Use `listar_filtros`: valores incluem acentos, como `comédia` e `ficção científica`. |
| JSON do catálogo inválido | Corrija os campos/IDs indicados pelo erro de inicialização. O serviço só fica pronto após validar o arquivo. |
| Alterei JSON e não mudou | Reinicie o processo local ou publique um novo deploy. Não há recarga automática. |
| Configuração existe, mas chat não vê tools | Abra nova sessão/recarregue o cliente e confira se ele suporta e habilitou a configuração. |
| `EADDRINUSE` | Pare o servidor que usa a porta ou use `PORT=3001 npm start`. |
| `EPERM` ao testar HTTP em ambiente restrito | O ambiente impede abrir portas. Execute em um terminal local autorizado; os testes usam porta temporária em loopback. |

O arquivo `.env` não é carregado por `npm start`. Use variáveis do ambiente ou `node --env-file=.env src/servidor-http.mjs`.

Logs do stdio ficam em stderr. Nunca acrescente `console.log` ao servidor stdio: stdout transporta mensagens MCP. O cliente de verificação pode usar stdout normalmente.
