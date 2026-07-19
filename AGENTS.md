# Monitor de Andamentos Processuais — Contexto do Projeto

## Objetivo

Automação para um escritório de advocacia que monitora processos judiciais
diariamente, detecta novas movimentações e notifica o advogado responsável
via Telegram, mantendo uma planilha atualizada como registro.

## Problema que resolve

Advogados precisam checar manualmente, processo por processo, se houve
andamento nos tribunais. Isso é repetitivo, sujeito a esquecimento e não
escala conforme o número de processos cresce.

## Estado atual (MVP)

Funcional e validado localmente. Fluxo:

1. Script lê `processos.xlsx` (número do processo, tribunal, advogado, chat_id)
2. Consulta a **API Pública do DataJud (CNJ)** para cada processo
3. Compara a movimentação mais recente retornada com a registrada na planilha
4. Se houver novidade: atualiza a planilha e envia mensagem no Telegram
5. Se não houver: marca "SEM ALTERAÇÃO" e segue pro próximo

**Stack atual:** TypeScript + tsx, ExcelJS, dotenv. Rodando localmente
(Pop!_OS) via `pnpm start`, execução manual.

## Decisões técnicas já tomadas

- **Fonte de dados:** API Pública do DataJud (CNJ) — gratuita, cobre ~91
  tribunais, mas **não é tempo real** (defasagem de horas a dias conforme o
  tribunal). Autenticação via API Key pública, formato
  `Authorization: APIKey <chave>` — chave e forma de obtenção documentadas
  na [Datajud-Wiki](https://datajud-wiki.cnj.jus.br/api-publica/acesso/).
  Não há processo claro de geração de chave própria; usa-se a chave pública
  vigente publicada pelo CNJ, sujeita a rotação sem aviso prévio.
- **Notificação:** Telegram (bot via @BotFather), por ser gratuito e simples
  de configurar — sem necessidade de infraestrutura de e-mail própria.
- **Planilha:** Excel local (.xlsx) como armazenamento inicial, por
  simplicidade e familiaridade do escritório.

## Limitações conhecidas do MVP

- Arquivo Excel bloqueia escrita se estiver aberto durante a execução do cron.
- Sem persistência real caso rode em ambiente efêmero (ex: containers do Render).
- Sem histórico de movimentações — só a última fica registrada por processo.
- Sem filtro por tipo de movimento (ex: notificar só sentença/intimação,
  ignorar juntadas triviais).
- Execução single-thread com delay de 1.5s entre chamadas (rate limit da API).

## Plano para produção

Migração de execução local/manual para serviço hospedado:

```
Vercel (frontend)  ──API──▶  Render (cron job)  ──▶  DataJud API
                                    │
                                    ▼
                          Banco de dados (Postgres/Neon)
                                    │
                                    ▼
                                Telegram
```

- **Backend/worker:** Render Cron Job rodando o script Node diariamente
  (substitui execução manual local).
- **Armazenamento:** migrar de Excel para Postgres (Neon, já usado no
  Yoodash) — Excel não persiste bem em ambiente efêmero. Excel pode
  permanecer como export/view sob demanda.
- **Frontend:** aplicação simples na Vercel para visualizar processos,
  status e histórico de andamentos.
- **Autenticação:** não definida ainda — depende de quantos advogados vão
  usar e se cada um cadastra os próprios processos.

## Pendências / decisões em aberto

- [ ] Validar teste real end-to-end (processo com andamento real recente)
- [ ] Definir schema do banco Postgres (tabela de processos + histórico de movimentos)
- [ ] Decidir se frontend terá autenticação/multiusuário
- [ ] Avaliar filtro de códigos de movimento relevantes (evitar ruído de notificações)
- [ ] Monitorar estabilidade da chave pública do DataJud (pode rotacionar sem aviso)
- [ ] Avaliar fallback para API paga (Judit/Escavador/Codilo) se DataJud se mostrar
      instável ou insuficiente para prazos fatais

## Estrutura de arquivos atual

```
monitor-processos/
├── src/index.ts       # script principal
├── processos.xlsx      # planilha de dados (input/output)
├── package.json
├── .env.example
└── README.md
```