# Monitor Processual

Aplicação multiusuário para importar carteiras de processos, acompanhar diariamente a API Pública do DataJud (CNJ) e notificar novos andamentos e prazos automaticamente pelo Telegram.

## Índice

- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Stack técnica](#stack-técnica)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Configuração](#configuração)
- [Desenvolvimento local](#desenvolvimento-local)
- [Banco de dados](#banco-de-dados)
- [Integração com o Telegram](#integração-com-o-telegram)
- [Worker de sincronização](#worker-de-sincronização)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Segurança](#segurança)
- [Scripts disponíveis](#scripts-disponíveis)

## Funcionalidades

- **Autenticação própria** por e-mail/senha (sessão em cookie assinado, sem depender de provedores externos).
- **Importação em massa** de processos via planilha `.xlsx`, com mapeamento automático de colunas e pré-visualização antes de confirmar.
- **Exportação** da carteira atualizada para `.xlsx`.
- **Monitoramento diário** de cada processo na API Pública do DataJud, com histórico de andamentos por processo.
- **Alertas heurísticos de prazo**, a partir de palavras-chave no texto da movimentação (não substitui o controle formal de prazos).
- **Notificações pelo Telegram**: novo andamento, possível prazo e audiência marcada, com preferências configuráveis por usuário.
- **Vínculo de conta Telegram** com link de uso único, expiração em 15 minutos e verificação automática da conexão.
- **Isolamento por usuário**: toda consulta da aplicação é filtrada pela sessão; apenas o worker percorre a carteira completa.

## Arquitetura

```
┌──────────────┐      importa/consulta       ┌───────────────┐
│   Next.js    │ ───────────────────────────▶ │  PostgreSQL   │
│ (Vercel)     │ ◀─────────────────────────── │  (Supabase)   │
└──────┬───────┘        Prisma ORM            └───────▲───────┘
       │ webhook                                       │ mesmo schema
       ▼                                                │
┌──────────────┐                              ┌─────────────────┐
│ Bot Telegram │                              │  Worker (Render │
└──────────────┘                              │  Cron Job)      │
       ▲                                      └────────┬────────┘
       └───────────── notifica novos andamentos ────────┘
                                                          │
                                                          ▼
                                            API Pública DataJud (CNJ)
```

- **Vercel / Next.js:** interface, autenticação, importação/exportação e webhook do Telegram.
- **Prisma ORM:** única camada de acesso a dados da aplicação e do worker.
- **Supabase:** hospedagem do PostgreSQL, sem uso de Auth, SDK ou RLS do Supabase.
- **Render Cron:** worker Node (`pnpm worker:sync`) que consulta a DataJud diariamente e dispara as notificações.

## Stack técnica

| Camada          | Tecnologia                                      |
| --------------- | ------------------------------------------------ |
| Framework       | Next.js 15 (App Router) + React 19               |
| Linguagem       | TypeScript                                        |
| Estilo          | Tailwind CSS v4                                   |
| UI              | Radix UI, lucide-react, sonner (toasts)           |
| ORM / banco     | Prisma + PostgreSQL (Supabase)                    |
| Autenticação    | Sessão própria em cookie, hash bcrypt, JWT (jose) |
| Planilhas       | `xlsx` (import/export), `exceljs` (script legado) |
| Validação       | Zod                                                |
| Notificações    | Bot Telegram (API HTTP direta)                    |
| Worker          | Node + `tsx`, agendado via Render Cron Job         |

## Estrutura do projeto

```
app/
  api/           # Rotas de API (import, export, processos, telegram, ...)
  auth/          # Login, cadastro, recuperação de senha
  dashboard/     # Área logada: carteira, importação, configurações, conta
components/      # Componentes de UI (dashboard, auth, ícones, primitivos)
lib/             # Regras de negócio: auth, banco, DataJud, Telegram, processos
prisma/          # schema.prisma e migrations
workers/         # sync.ts — worker executado pelo Render Cron Job
src/             # Protótipo standalone original (planilha local + Telegram),
                 # mantido apenas como referência histórica; não faz parte do app.
```

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Uma conta [Supabase](https://supabase.com) (PostgreSQL)
- Uma chave de API da [DataJud (CNJ)](https://datajud-wiki.cnj.jus.br/api-publica/)
- Um bot no Telegram (opcional, mas necessário para notificações)

## Configuração

1. Clone o repositório e instale as dependências:

   ```bash
   pnpm install
   ```

   O `postinstall` já executa `prisma generate`.

2. Copie o arquivo de exemplo de variáveis de ambiente e preencha os valores (veja [Variáveis de ambiente](#variáveis-de-ambiente)):

   ```bash
   cp .env.example .env.local
   ```

## Desenvolvimento local

1. Configure `DATABASE_URL`, `DIRECT_URL` e `AUTH_SECRET` em `.env.local`. Para rodar o worker localmente, repita as variáveis privadas (`DATABASE_URL`, `DIRECT_URL`, `DATAJUD_API_KEY`, `TELEGRAM_BOT_TOKEN`) em `.env`, já que ele não lê `.env.local`.
2. Aplique o schema no banco: `pnpm prisma:deploy`.
3. Inicie a interface: `pnpm dev` e acesse `http://localhost:3000`.
4. Para testar a sincronização localmente: `pnpm worker:sync`.

## Banco de dados

1. Crie um projeto no Supabase e obtenha as duas connection strings em **Connect**.
2. Preencha em `.env.local`:
   - `DATABASE_URL`: conexão *pooler* do Supabase, com `pgbouncer=true`, usada pela aplicação e pelo worker.
   - `DIRECT_URL`: conexão direta `db.<project-ref>.supabase.co:5432`, usada exclusivamente por migrations.
   - `AUTH_SECRET`: valor aleatório com pelo menos 32 caracteres para assinar cookies de sessão.
3. Aplique a estrutura com `pnpm prisma:deploy`. Em desenvolvimento, use `pnpm prisma:migrate --name descricao_da_mudanca`.

As migrations ficam em `prisma/migrations` e o schema em `prisma/schema.prisma`. O Prisma gerencia as tabelas de usuários, processos, histórico de eventos, importações, vínculos Telegram e execuções do worker.

## Integração com o Telegram

1. Crie um bot uma única vez com o [`@BotFather`](https://t.me/BotFather) e defina `TELEGRAM_BOT_TOKEN` e `TELEGRAM_BOT_USERNAME`.
2. Gere um segredo forte para `TELEGRAM_WEBHOOK_SECRET`.
3. Após publicar a aplicação, registre o webhook apontando para o domínio de produção:

   ```bash
   curl -F "url=https://SEU_DOMINIO/api/telegram/webhook" \
     -F "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
     "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook"
   ```

4. No painel, o usuário gera um link de vinculação (token de uso único, expira em 15 minutos) e abre o bot no Telegram. Ao enviar `/start`, o bot confirma a conexão (ou informa se o link é inválido/expirou), e a interface detecta a conexão automaticamente — sem precisar recarregar a página.

O bot compartilha apenas o chat vinculado à conta que gerou o link.

## Worker de sincronização

Crie um **Cron Job** no Render com o comando `pnpm worker:sync`, agendado em dias úteis. Defina as variáveis `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `DATAJUD_API_KEY`, `TELEGRAM_BOT_TOKEN` e `WORKER_DELAY_MS`.

Comportamento:

- Percorre todos os processos ativos de todos os usuários.
- Consulta a movimentação mais recente de cada processo na API DataJud, respeitando um intervalo (`WORKER_DELAY_MS`, padrão 1,5 s) entre chamadas para não estourar limites de taxa.
- No primeiro sucesso de um processo, grava a linha de base sem gerar alerta.
- A partir da próxima execução, registra todos os novos eventos retornados pela API e envia notificação no Telegram (novo andamento, possível prazo por palavra-chave, ou audiência) para quem tiver chat conectado e a preferência habilitada.

## Variáveis de ambiente

| Variável                 | Onde é usada        | Descrição                                                                 |
| ------------------------ | -------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`           | App + worker         | Connection string do PostgreSQL via pooler (`pgbouncer=true`).             |
| `DIRECT_URL`             | Migrations           | Connection string direta do PostgreSQL (porta 5432).                       |
| `AUTH_SECRET`            | App                   | Segredo (≥ 32 caracteres) usado para assinar os cookies de sessão.          |
| `DATAJUD_API_KEY`        | Worker                | Chave de acesso à API Pública do DataJud (CNJ).                            |
| `TELEGRAM_BOT_TOKEN`     | App + worker          | Token do bot, emitido pelo `@BotFather`.                                    |
| `TELEGRAM_BOT_USERNAME`  | App                   | Username do bot (sem `@`), usado para montar o link de vinculação.          |
| `TELEGRAM_WEBHOOK_SECRET`| App                   | Segredo validado no cabeçalho enviado pelo Telegram ao webhook.             |
| `WORKER_DELAY_MS`        | Worker                | Intervalo em ms entre consultas à DataJud (padrão `1500`).                  |

## Segurança

- `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, DataJud e Telegram são somente variáveis de servidor — nunca expostas ao cliente.
- Senhas usam hash bcrypt; a sessão fica em cookie `HttpOnly`, `Secure` em produção, com expiração de sete dias.
- Toda consulta da aplicação filtra pelo `userId` da sessão. O worker é o único componente que percorre a carteira completa.
- O arquivo `.xlsx` em si nunca é salvo em disco. Os dados extraídos ficam retidos no banco apenas durante a etapa de confirmação (enquanto a importação está em `PREVIEW`/`PROCESSING`) e são descartados assim que o processamento termina.
- O endpoint do webhook Telegram rejeita requisições sem o cabeçalho secreto configurado (`x-telegram-bot-api-secret-token`).

## Scripts disponíveis

| Comando                 | Descrição                                            |
| ------------------------ | ----------------------------------------------------- |
| `pnpm dev`                | Sobe a aplicação Next.js em modo desenvolvimento.     |
| `pnpm build`              | Gera o build de produção.                             |
| `pnpm start`              | Inicia o build de produção.                           |
| `pnpm lint`               | Roda o ESLint no projeto.                              |
| `pnpm worker:sync`        | Executa uma sincronização com a DataJud (usado pelo Render Cron Job). |
| `pnpm prisma:generate`    | Gera o cliente Prisma.                                 |
| `pnpm prisma:migrate`     | Cria e aplica uma migration em desenvolvimento.        |
| `pnpm prisma:deploy`      | Aplica as migrations pendentes (produção/CI).          |
