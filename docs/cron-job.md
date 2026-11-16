# Monitorar pelo cron-job.org

Faça esta etapa depois do deploy, quando tiver a URL real e `/health` já responder 200. O cron não faz parte do processo Node nem exige chave de API no projeto.

1. Entre na sua conta do [cron-job.org](https://cron-job.org/en/).
2. Crie um cronjob com o título **CineCatálogo MCP — saúde**.
3. Informe `https://SEU-SERVICO.onrender.com/health`, substituindo o domínio.
4. Selecione **a cada 5 minutos**. Se usar agendamento personalizado, os minutos são 0, 5, 10, 15…55, nas horas e dias desejados. A expressão equivalente é `*/5 * * * *`, caso a interface ofereça esse formato.
5. Selecione fuso **America/Sao_Paulo** e método **GET**. Não precisa de corpo, autenticação ou cabeçalho especial.
6. Execute o teste manual. Confira HTTP 200 e `status: ok`, com 160 filmes.
7. Salve/ative e confira uma execução agendada no histórico. Opcionalmente habilite notificações de falha e recuperação para seu próprio canal.

Resposta prevista:

```json
{"status":"ok","catalogo_carregado":true,"total_filmes":160,"filmes_reais":100,"filmes_ficticios":60,"versao":"2.0.0"}
```

A chamada é pequena, não executa ferramenta MCP e não chama modelo de IA. `/health` comprova que o processo está atendendo e carregou o catálogo; não comprova que a descoberta e a chamada MCP funcionam. Para isso, execute o verificador do projeto.

## Primeiro acesso e falso alarme

O cron-job.org documenta timeout de 30 segundos. O despertar do Render pode levar aproximadamente um minuto. A primeira tentativa pode, portanto, falhar antes de o processo estar pronto. Antes da aula, acesse `/health` e espere o servidor ficar disponível. Confira a próxima verificação e o histórico antes de interpretar um timeout isolado como falha do código.

Pings periódicos podem evitar o intervalo de inatividade, mas não são garantia de disponibilidade. O cron também pode atrasar. A documentação técnica não equivale a autorização irrestrita para keep-alive; respeite os termos e limites dos dois serviços. Pause o agendamento quando não precisar manter o exemplo disponível e acompanhe as horas do workspace Render.

Não aponte o cron para `/mcp`, nem para `/robots.txt`. Não faça consultas à IA para manter o serviço ativo. Não há automação criada nesta entrega: você ainda precisa cadastrar o job na sua conta com a URL final.

Fontes: [funcionalidades](https://cron-job.org/en/), [FAQ e timeout](https://cron-job.org/en/faq/), [Render Free](https://render.com/docs/free), consultadas em 16/11/2026.
