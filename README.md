# Monitor Processual

Aplicação multiusuário para importar processos, consultar diariamente a API Pública DataJud e notificar novos andamentos pelo Telegram.

## Arquitetura

- **Vercel / Next.js:** interface, autenticação por e-mail/senha, importação, exportação e webhook Telegram.
- **Prisma ORM:** única camada de acesso a dados da aplicação.
- **Supabase:** hospedagem do PostgreSQL, sem uso de Auth, SDK ou RLS do Supabase.
- **Render Cron:** worker Node (`pnpm worker:sync`) que consulta a DataJud diariamente.

## Banco de dados

1. Crie um projeto Supabase e obtenha as duas connection strings em **Connect**.
2. Preencha `.env.local` a partir de `.env.example`:
   - `DATABASE_URL`: conexão pooler do Supabase, com `pgbouncer=true`, para a aplicação e worker.
   - `DIRECT_URL`: conexão direta `db.<project-ref>.supabase.co:5432`, usada exclusivamente por migrations.
   - `AUTH_SECRET`: valor aleatório com pelo menos 32 caracteres para assinar cookies de sessão.
3. Aplique a estrutura com `pnpm prisma:deploy`. Em desenvolvimento, use `pnpm prisma:migrate --name descricao_da_mudanca`.

As migrations ficam em `prisma/migrations` e o schema em `prisma/schema.prisma`. O Prisma gerencia as tabelas `users`, `processes`, histórico, importações, vínculos Telegram e execuções do worker.

## Desenvolvimento local

1. Configure `DATABASE_URL`, `DIRECT_URL` e `AUTH_SECRET` em `.env.local`. Para rodar o worker local, repita as variáveis privadas em `.env`.
2. Instale dependências: `pnpm install`. A instalação gera o cliente Prisma.
3. Execute `pnpm prisma:deploy`.
4. Inicie a interface: `pnpm dev`.

## Telegram

1. Crie um bot uma vez no `@BotFather` e defina `TELEGRAM_BOT_TOKEN` e `TELEGRAM_BOT_USERNAME`.
2. Gere um segredo forte para `TELEGRAM_WEBHOOK_SECRET`.
3. Após publicar, registre o webhook:

```bash
curl -F "url=https://SEU_DOMINIO/api/telegram/webhook" \
  -F "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
  "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook"
```

O usuário abre o link gerado no painel; o token é de uso único e expira em 15 minutos. O bot compartilha apenas o chat vinculado àquela conta.

## Worker Render

Crie um **Cron Job** no Render com o comando `pnpm worker:sync`, agendado em dias úteis. Defina `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `DATAJUD_API_KEY`, `TELEGRAM_BOT_TOKEN` e `WORKER_DELAY_MS`. O worker mantém 1,5 s entre consultas por padrão.

O primeiro sucesso para cada processo grava a linha de base sem alerta. A partir da próxima movimentação, grava todos os novos eventos retornados pela API e envia Telegram se houver chat conectado.

## Segurança

- `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, DataJud e Telegram são somente variáveis de servidor.
- Senhas usam hash bcrypt; a sessão fica em cookie `HttpOnly`, `Secure` em produção e com expiração de sete dias.
- Toda consulta de aplicação filtra pelo `userId` da sessão. O worker é o único componente que percorre a carteira completa.
- Planilhas são analisadas em memória e não são armazenadas após a importação.
- O endpoint Telegram rejeita requisições sem o cabeçalho secreto enviado pelo Telegram.
