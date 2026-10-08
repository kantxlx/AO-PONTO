# Banco de dados

O Ao Ponto utiliza PostgreSQL 17. O banco é criado pelo Docker Compose no ambiente local ou por um administrador PostgreSQL. As tabelas são criadas pelos scripts de migração do projeto.

## Criar e carregar

Com Docker instalado, execute na raiz do projeto:

```powershell
docker compose up -d db
Copy-Item apps/api/.env.example apps/api/.env
npm.cmd run db:migrate
npm.cmd run db:seed
```

Se `apps/api/.env` já existir, preserve a configuração e confira `DATABASE_URL` em vez de sobrescrever o arquivo. O nome do banco local é `aoponto`, o usuário é `aoponto` e a porta é 5432. As credenciais de desenvolvimento estão no compose e no exemplo de ambiente.

Sem Docker, crie um banco PostgreSQL vazio e configure sua URL em `apps/api/.env`; depois execute os mesmos comandos de migração e seed. Nenhuma instalação de PostgreSQL é realizada automaticamente pelos scripts.

## Tabelas

| Tabela              | Dados                                                                  |
| ------------------- | ---------------------------------------------------------------------- |
| `cuts`              | Catálogo, preços em centavos, unidades, disponibilidade e ativação     |
| `users`             | Funcionários e gerentes, e-mail, hash de senha e perfil                |
| `orders`            | Pedido, número, estado, escolha presencial, responsável e idempotência |
| `order_items`       | Quantidade, corte, nome e preço históricos do item                     |
| `service_tickets`   | Senha vinculada ao pedido, sequência e contadores de chamada           |
| `call_history`      | Histórico de chamadas e reemissões                                     |
| `system_settings`   | Configuração única de exibição, reemissão e fuso horário               |
| `business_hours`    | Horário por dia da semana ou indicação de fechamento                   |
| `schema_migrations` | Histórico e checksum dos scripts aplicados                             |

```mermaid
erDiagram
  USERS ||--o{ ORDERS : atende
  USERS ||--o{ CALL_HISTORY : chama
  ORDERS ||--|{ ORDER_ITEMS : possui
  CUTS ||--o{ ORDER_ITEMS : identifica
  ORDERS ||--o| SERVICE_TICKETS : recebe
  SERVICE_TICKETS ||--o{ CALL_HISTORY : registra
```

O fluxo deverá criar pedido, itens e senha na mesma transação. As chaves estrangeiras garantem os vínculos; a presença de pelo menos um item e as transições de estado precisam ser garantidas pelo serviço de registro. Os endpoints desses fluxos são implementados nos respectivos casos de uso.

## Integridade

- E-mails são únicos, ignorando caixa e espaços externos.
- Senhas de usuários são representadas por hash; o banco não cria contas com senhas padrão.
- A chave de idempotência do pedido é única. O serviço deve tratar reenvios recuperando o pedido existente.
- Cada pedido possui no máximo uma senha; os números são gerados pelo PostgreSQL, evitando um contador na memória da aplicação. A sequência é contínua, sem reinício diário, e pode ter lacunas após rollback.
- Quantidades são positivas, limitadas a 100 e inteiras para unidade `un`.
- O subtotal do item é calculado no banco a partir da quantidade e do preço em centavos.
- Nome e preço do item são preservados mesmo que o catálogo mude.
- Exclusões de cortes e pedidos referenciados são bloqueadas; a remoção do catálogo deve usar desativação.
- Conclusão de pedido exige data de conclusão; estados e tipos de chamada possuem valores restritos.
- Horários de fechamento devem ser posteriores aos de abertura, no mesmo dia. Intervalos que cruzam a meia-noite e múltiplos turnos por dia não estão contemplados nesta modelagem.

## Migrações

Os scripts numerados em `apps/api/database` são aplicados na ordem do nome. O comando registra o checksum e executa as alterações em transação, com bloqueio para impedir execuções simultâneas. Reexecutar o comando ignora migrações já aplicadas.

Após aplicar um script, não o edite: crie outra migração. Se um script aplicado mudar, o comando interrompe a execução. O catálogo antigo, criado pelo script inicial sem histórico, é preservado pelo `CREATE TABLE IF NOT EXISTS` ao introduzir o controle de migrações.

O seed insere apenas cortes fictícios ausentes. Não altera cortes existentes, não cria usuários e não define horários reais do estabelecimento. Existe uma configuração inicial com 15 segundos de exibição, limite de 3 reemissões e fuso `America/Sao_Paulo`, a confirmar conforme a operação.

## Validação

O CI cria PostgreSQL 17, aplica as migrações duas vezes para verificar reexecução, carrega o catálogo e testa preços, vínculos, idempotência, quantidades, senhas e horários. Os testes de integridade usam transação com rollback e não deixam pedidos ou usuários de teste persistidos.

Para executar localmente, use um banco isolado com migração e seed aplicados:

```powershell
$env:TEST_DATABASE_URL='postgresql://aoponto:local_dev_only@localhost:5432/aoponto'
npm.cmd test
```

Sem essa variável, os testes PostgreSQL são explicitamente ignorados.
