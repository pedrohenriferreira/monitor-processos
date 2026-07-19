leia o arquivo agents.md para ficar por dentro do contexto do script/projeto e proximos passos

- usuario criar conta/login
- conversor de planilhas excel para que o usuario insira a planilha com os processos dele então o script ira formatar para ler no padrão da planilha padrão que definimos 
- planilhas devem ser convertidas em tabelas no front que são atualizadas conforme os dados da api para cada processo
- preciso criar um bot individual para cada usuario que desejar receber as notificações pelo telegram
- dados precisam ficar atrelados aos seus respectivos usuarios, exemplo de fluxo: usuario cria conta --> loga --> insere tabela --> tabela é convertida no back para extrair os dados necessarios --> planilha é convertida para o front e atualizada automaticamente quando houver andamento no processo || usuario pode receber notificações pelo telegram --> usuario pode fazer o download da tabela atualizada

# regras

- design objetivo e clean
- usar componentes do shadcn
- modelagem de arquitetura com foco em Security-First
- banco supabase