# Como funciona hoje (local):

# Monitor de Andamentos Processuais

Consulta diariamente a API Pública do DataJud (CNJ), atualiza a planilha
`processos.xlsx` e notifica o advogado no Telegram quando há novo andamento.

## Setup 

1. **Instalar dependências**
   ```bash
   pnpm install   # ou npm install
   ```

2. **Chave do DataJud**
   A chave pública vigente fica na wiki oficial do CNJ:
   https://datajud-wiki.cnj.jus.br/api-publica/acesso/

3. **Bot do Telegram**
   - Fale com o `@BotFather` no Telegram → `/newbot` → copie o token.
   - Adicione o bot ao grupo do escritório (ou inicie conversa direta).
   - Envie qualquer mensagem e acesse
     `https://api.telegram.org/bot<TOKEN>/getUpdates` para descobrir o `chat_id`.

4. **Configurar `.env`**
   ```bash
   cp .env.example .env
   # edite com sua chave, token e chat_id
   ```

5. **Preencher a planilha**
   Abra `processos.xlsx` e preencha as colunas amarelas (A–D).
   O campo *Tribunal* usa o alias do DataJud: `tjsp`, `tjrj`, `trf3`, `trt2`, `tst`, etc.
   Lista completa: https://datajud-wiki.cnj.jus.br/api-publica/endpoints/

6. **Rodar manualmente**
   ```bash
   pnpm start
   ```

## Agendamento diário

**Linux (cron)** — todo dia às 8h:
```
0 8 * * 1-5 cd /caminho/monitor-processos && /usr/bin/pnpm start >> log.txt 2>&1
```

**Windows (Agendador de Tarefas):** crie uma tarefa diária executando
`pnpm start` no diretório do projeto (feche o Excel antes — arquivo aberto
bloqueia a escrita).

## Observações

- O DataJud **não é tempo real**: a defasagem varia de horas a dias conforme
  o tribunal. Para prazos fatais, combine com o acompanhamento do DJE.
- Processos sob segredo de justiça não aparecem na API.
- O script aguarda 1,5s entre consultas para respeitar o rate limit da API.
