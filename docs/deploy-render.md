# Hospedar o CineCatálogo no Render

## 1. Preparar o repositório

Use **somente o conteúdo de `mcp-cinema/`** como raiz de um repositório próprio. Inclua `package-lock.json`, `.node-version`, `render.yaml`, `src/`, `dados/`, `scripts/`, `tests/` e documentos. Não envie `node_modules`, `.env` ou a pasta inteira da disciplina. O `.gitignore` já protege os arquivos locais usuais.

O projeto inclui um lockfile com integridades, runtime testado e todas as dependências. Não precisa de Docker, banco de dados ou chave de IA. Teste antes com `npm ci --ignore-scripts` e `npm test`.

## 2. Criar o serviço

No Render, escolha New > Web Service e conecte o repositório. Confira:

| Campo | Valor |
|---|---|
| Language/runtime | Node |
| Branch | A branch em que publicou o projeto |
| Root Directory | Vazio se este projeto estiver na raiz |
| Build Command | `npm ci --ignore-scripts` |
| Start Command | `npm start` |
| Instance Type | Free |
| Health Check Path | `/health` |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `24.14.1` |

Alternativa: criar um Blueprint usando o `render.yaml` incluído, conferindo o plano Free antes de concluir. O nome `cinecatalogo-mcp` é uma sugestão; a URL final será a que o Render atribuir.

Se optar por hospedar a partir do repositório maior da disciplina, configure Root Directory como `mcp-cinema`. Para Blueprint nesse cenário, adapte `rootDir` e o caminho do arquivo, em vez de usar a configuração de raiz sem ajuste.

O código respeita a variável `PORT` e escuta em `0.0.0.0`. Não fixe uma porta do computador no painel. O host público padrão é reconhecido por `RENDER_EXTERNAL_HOSTNAME`, fornecida pelo Render. Para domínio próprio, acrescente seu hostname em `ALLOWED_HOSTS` (sem `https://`, porta ou caminho).

## 3. Verificar a implantação

Aguarde o estado Live e procure nos logs “CineCatálogo HTTP pronto”. Copie a URL real, por exemplo `https://SEU-SERVICO.onrender.com`, e execute:

```bash
curl --fail --max-time 90 https://SEU-SERVICO.onrender.com/health
npm run verificar -- https://SEU-SERVICO.onrender.com/mcp
```

Execute o segundo comando no computador, dentro da pasta do projeto. Saúde deve indicar 60 filmes. O verificador deve descobrir sete ferramentas, obter quatro comédias até 110 minutos, consultar `FILME-001` e validar comparação, sessão, estatísticas e alternativas. Guarde a revisão implantada e a data do teste. Abrir `/mcp` no navegador e receber 405 não significa que o MCP falhou: a verificação correta utiliza o protocolo.

Depois, conecte o cliente de IA e configure o cron conforme os outros guias. Não use a URL de exemplo sem substituí-la.

## 4. Operação do plano gratuito

O Render documenta repouso após 15 minutos sem tráfego e aproximadamente um minuto para despertar. O workspace compartilha 750 horas gratuitas mensais entre serviços. Há limites separados de tráfego e builds. Confira o painel de uso, sobretudo se já houver outros projetos.

O JSON está incluído no deploy, portanto permanece como parte da versão do código. Alterações gravadas no disco em execução não seriam persistentes no plano Free. Esta aplicação não faz essas gravações.

O cron não garante disponibilidade e não impede reinicializações. Para a aula, confira `/health`, depois uma consulta MCP real. Mantenha o modo local preparado.

## Fontes

Consultadas em 16/11/2026: [Web Services](https://render.com/docs/web-services), [Blueprint](https://render.com/docs/blueprint-spec), [variáveis automáticas](https://render.com/docs/environment-variables), [Free](https://render.com/docs/free). Planos e interface podem mudar.
