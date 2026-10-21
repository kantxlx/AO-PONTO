# Testes automatizados e validação

Este documento registra como o Ao Ponto é testado, o que a suíte cobre e quais verificações ainda dependem do ambiente. A validação não altera as regras de negócio: os testes novos apenas tornam explícitos comportamentos já implementados.

## Como executar

Requisitos: Node.js 22.12 ou superior. A validação registrada usou Node.js 24.15.0 e npm 11.12.1.

```powershell
npm.cmd ci --include=dev
npm.cmd test
npm.cmd run build
```

Para executar apenas uma área:

```powershell
npm.cmd test -w @ao-ponto/api
npm.cmd test -w @ao-ponto/web
```

### Testes PostgreSQL

Três testes de integração com PostgreSQL são ignorados quando `TEST_DATABASE_URL` não está definida. Use um banco isolado, nunca o banco de produção. Nesta validação foi usado `aoponto_test` no PostgreSQL local do Docker:

```powershell
# Na primeira execução; se o banco já existir, pule esta linha.
docker compose exec -T db createdb -U aoponto aoponto_test

$env:DATABASE_URL='postgresql://aoponto:local_dev_only@127.0.0.1:5432/aoponto_test'
npm.cmd run db:migrate
npm.cmd run db:seed

$env:TEST_DATABASE_URL=$env:DATABASE_URL
npm.cmd test -w @ao-ponto/api

Remove-Item Env:DATABASE_URL, Env:TEST_DATABASE_URL
```

O `db:migrate` cria as tabelas; o `db:seed` carrega os oito cortes fictícios esperados pelos testes. Os testes de esquema usam transação e `ROLLBACK`; o teste de pedido PostgreSQL remove os próprios registros ao final. Ainda assim, o banco deve ser exclusivo para teste.

## Suítes e cobertura

| Arquivo                            | Tipo        | Cobertura principal                                                                         |
| ---------------------------------- | ----------- | ------------------------------------------------------------------------------------------- |
| `apps/api/test/catalog.test.js`    | API         | Catálogo, preço em centavos, indisponibilidade e falha recuperável                          |
| `apps/api/test/order.test.js`      | API/serviço | Pedido, preço do servidor, idempotência, fila, chamadas, reemissão, conclusão, perfis e SSE |
| `apps/api/test/regression.test.js` | API/serviço | Payload inválido, conflito de idempotência, transições, administração e HTTP                |
| `apps/api/test/load.test.js`       | Carga       | 200 consultas ao catálogo com 5 clientes simultâneos                                        |
| `apps/api/test/schema.test.js`     | PostgreSQL  | Migrações e restrições de usuários, pedidos, itens, senhas e horários                       |
| `apps/web/test/cart.test.js`       | Unidade     | Quantidade, subtotal, restauração e reconciliação do carrinho                               |
| `apps/web/test/format.test.js`     | Unidade     | Preço administrativo, moeda, senha, busca sem acentos e tempo de espera                     |

Os testes de API usam `node:test`, `createMemoryOperations`, `createOperationsService` e `createApp`. Isso permite validar regras e contrato HTTP sem banco. Os testes PostgreSQL cobrem o que depende de SQL, transações e restrições do esquema.

### Cenários funcionais cobertos

- **UC01 — catálogo:** lista cortes, preço, unidades e disponibilidade; falha do repositório vira erro recuperável sem detalhes internos.
- **UC02 — seleção:** aceita kg com vírgula, limita quantidade, exige unidade inteira, impede corte indisponível e reconcilia a seleção local.
- **UC03/05 — pedido:** calcula o total no servidor, ignora preço adulterado, grava pedido e senha em transação e recupera reenvios pela chave de idempotência.
- **UC04/06/07/08/09 — atendimento:** ordem FIFO, agrupamento por corte/unidade, chamada concorrente, reemissão, expiração, restauração e conclusão.
- **UC10–14 — administração e acesso:** perfis, catálogo histórico, usuário desativado, proteção do último gerente e expediente.
- **Chamada automática:** intervalo, limite de repetições, expiração e chamada seguinte.
- **HTTP:** cookie de sessão, origem, JSON inválido, rota inexistente, acesso anônimo, permissão de funcionário e limite de tentativas de login.
- **Carga:** consultas concorrentes ao catálogo em memória, usadas como referência de regressão.

## Resultado da validação

- Data: 21/10/2026.
- Branch: `testes/validacao`, criada a partir de `main` (`d631d7a`).
- `npm.cmd test` com `TEST_DATABASE_URL`: **28 aprovados**, **0 falhas**, **0 ignorados**. Sendo 17 aprovados na API e 11 na web. Sem a variável, os 3 testes PostgreSQL são ignorados.
- `npm.cmd run build`: concluído com Vite 7.3.7. Artefatos finais: JavaScript de 321,04 kB (101,08 kB gzip) e CSS de 73,95 kB (15,33 kB gzip).
- Smoke HTTP no modo demo: saúde, catálogo, expediente, painel, pedido, login de gerente, operações, chamada, conclusão, acompanhamento, sessão e logout responderam conforme esperado.
- Teste funcional no navegador: catálogo, seleção de 0,500 kg de picanha, carrinho, envio, senha `007`, QR code, login de gerente, chamada, conclusão da senha `002`, administração, painel atualizado e acompanhamento concluído.

## Limitações

- A execução padrão, sem `TEST_DATABASE_URL`, ignora os três testes PostgreSQL. Com o banco isolado `aoponto_test`, os 17 testes da API passaram.
- Não há teste E2E automatizado com navegador; os fluxos de interface foram verificados manualmente. A inclusão de Playwright depende de autorização para adicionar dependência e configurar o CI.
- A auditoria responsiva foi feita por simulação de viewport no navegador, não em aparelhos físicos. Consulte [responsividade.md](responsividade.md).
- O modo demo mantém os dados em memória. Reiniciar o servidor apaga pedidos, usuários e configurações.
- O teste offline exige build de produção e uma origem HTTPS ou localhost compatível com service worker.
- O QR code gerado com `127.0.0.1` não abre em outro celular; para testar entre dispositivos é necessário usar um endereço de LAN ou uma implantação HTTPS.

## Critério de aceite

Uma alteração é considerada validada quando `npm.cmd test` e `npm.cmd run build` passam, os fluxos de catálogo → pedido → atendimento → acompanhamento continuam funcionando e nenhuma rota apresenta rolagem horizontal indevida nas larguras mínimas documentadas.
