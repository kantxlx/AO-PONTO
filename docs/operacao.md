# Implantação, backup e recuperação

## Ambiente

A imagem Docker reúne frontend compilado e API. O PostgreSQL usa volume persistente; o banco não publica porta na configuração de produção. A API publica somente `127.0.0.1:3001`, para um proxy HTTPS no mesmo host. A senha do PostgreSQL deve ser definida no ambiente; não existe senha de produção no repositório.

```powershell
# Use um segredo aleatório hexadecimal para evitar caracteres reservados na URL.
$env:POSTGRES_PASSWORD=Read-Host 'Senha PostgreSQL de produção (hexadecimal)'
docker compose -f compose.production.yaml build
docker compose -f compose.production.yaml up -d db
docker compose -f compose.production.yaml run --rm api npm run db:migrate
# Opcional: catálogo fictício para um ambiente de demonstração separado.
# docker compose -f compose.production.yaml run --rm api npm run db:seed
docker compose -f compose.production.yaml up -d api
```

Crie o primeiro gerente com `admin:create`, fornecendo `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` ao comando `docker compose ... run --rm -e ADMIN_NAME -e ADMIN_EMAIL -e ADMIN_PASSWORD api npm run admin:create`. Remova `ADMIN_PASSWORD` do ambiente depois. A conta demonstrativa não existe nesse banco.

Configure o proxy para HTTPS, preservar o cabeçalho `Host` e encaminhar `/`, `/api` e `/sw.js` à API. Para `/api/events`, desative buffering e permita conexões longas. As sessões usam cookie Secure em produção. O servidor de desenvolvimento e o modo demo não substituem uma implantação HTTPS.

A configuração utiliza uma instância da API. Reiniciar encerra sessões e conexões SSE, que se restabelecem no painel. O PostgreSQL preserva pedidos, configurações e histórico. O modo demonstrativo nunca deve ser usado para armazenar dados operacionais.

## Saúde e diagnóstico

- `GET /api/health`: processo HTTP em execução.
- `GET /api/ready`: consulta configuração persistida; falha quando o banco não pode ser consultado.
- `docker compose -f compose.production.yaml logs --tail=100 api`: eventos da API.
- `docker compose -f compose.production.yaml ps`: estado dos serviços.

O pool limita conexões e espera de conexão a 2 segundos, com timeout SQL de 2,5 segundos. A fila usa transações e bloqueio PostgreSQL para coordenar mutações. Logs não devem conter senhas ou cookies; armazene os segredos fora do controle de versão.

## Backup

Execute com a aplicação em uso; `pg_dump` gera um snapshot consistente. O exemplo usa `compose.production.yaml`. Mantenha cópias fora do mesmo disco e controle acesso aos arquivos, que incluem hashes de usuários e o histórico de operação.

```powershell
New-Item -ItemType Directory -Force backups
$backupName='aoponto-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.dump'
docker compose -f compose.production.yaml exec -T db pg_dump -U aoponto -d aoponto -Fc -f /tmp/aoponto.dump
docker compose -f compose.production.yaml cp db:/tmp/aoponto.dump "backups/$backupName"
```

O diretório `backups` está ignorado pelo Git e pelo build Docker. Uma política inicial é realizar backup diário e reter 7 cópias diárias e 4 semanais, ajustando ao volume real. O agendamento e o destino externo dependem do ambiente de hospedagem.

## Ensaio de restauração

Restaure primeiro em **um banco novo**, sem substituir o banco em operação. O comando `createdb` falha caso o destino já exista, evitando sobrescrita silenciosa.

```powershell
docker compose -f compose.production.yaml cp "backups/ARQUIVO.dump" db:/tmp/restore.dump
docker compose -f compose.production.yaml exec -T db createdb -U aoponto aoponto_restore
docker compose -f compose.production.yaml exec -T db pg_restore -U aoponto -d aoponto_restore --no-owner --exit-on-error /tmp/restore.dump
docker compose -f compose.production.yaml exec -T db psql -U aoponto -d aoponto_restore -c 'SELECT count(*) FROM orders; SELECT count(*) FROM schema_migrations;'
```

Confira contagens, migrações, usuários e pedidos; execute a aplicação apontando para o banco restaurado em ambiente separado. Só então planeje a troca do banco de operação, com interrupção de escrita e um backup adicional. Migrações aplicadas não são editadas nem revertidas por exclusão de tabelas; alterações devem usar novos arquivos SQL.

## Validação e limites

O CI aplica migrações, executa testes de integração e restaura um dump em banco isolado. Também constrói a imagem e verifica os endpoints e a página compilada. Esses testes validam o empacotamento e o procedimento, sem comprovar configuração de um servidor externo.

A publicação pública, domínio, certificado HTTPS, cópias externas agendadas e homologação com os equipamentos do estabelecimento precisam ser configurados no ambiente escolhido. Não há hospedagem pública criada por esses arquivos.
