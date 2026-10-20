# Ao Ponto

Sistema web de autoatendimento e organização do atendimento em açougues. O cliente consulta cortes, confirma o pedido e recebe uma senha; a equipe acompanha a fila e o preparo, e o gerente administra o catálogo e os horários.

## Funcionalidades

- Cardápio com fotos ilustrativas, busca sem acentos, categorias, ordenação por preço e filtro de disponibilidade.
- Seleção em kg ou unidades, atalhos de quantidade, edição dos itens e revisão antes da confirmação.
- Fluxo de totem: cardápio → carrinho → envio ao açougue → senha em tela inteira, com botão de novo pedido e reinício automático após 30 segundos.
- Registro transacional de pedido, itens e senha, com proteção contra reenvios duplicados.
- Indicação de escolha da peça no balcão.
- Painel público com chamadas, histórico e reconexão por SSE.
- Atendimento com indicadores, busca e filtros, fila FIFO, agrupamento por corte/unidade, reemissão e confirmação da entrega.
- Chamadas automáticas configuráveis e recuperação de senhas expiradas.
- Login da equipe, perfis de gerente e funcionário e administração de usuários.
- Cadastro, edição e desativação de cortes, preservando os pedidos anteriores.
- Horários por dia da semana no fuso America/Sao_Paulo.
- Indicadores da fila e acompanhamento individual da senha por link ou QR code.
- Catálogo em cache e confirmação pendente no navegador durante falhas de conexão. A senha é emitida somente após confirmação do servidor.

## Executar no notebook

Requisitos: Node.js 22.12 ou superior e npm. No terminal, abra a pasta que contém `package.json`:

```powershell
npm.cmd ci --include=dev
npm.cmd run demo
```

Abra [http://127.0.0.1:4173](http://127.0.0.1:4173). No Windows, depois de instalar as dependências, também é possível abrir `iniciar.cmd`.

O modo demonstrativo usa dados fictícios em memória: **pedidos, usuários e alterações são apagados ao encerrar o servidor**. Ele não exige PostgreSQL nem internet após instalar as dependências. Para acessar Atendimento e Administração nesse modo:

- E-mail: `gerente@demo.local`
- Senha: `DemoAoPonto2026!`

Essa conta é criada exclusivamente no modo de demonstração. O banco PostgreSQL não recebe usuários ou senhas padrão.

| Área             | Endereço local                      |
| ---------------- | ----------------------------------- |
| Cardápio         | http://127.0.0.1:4173/#/            |
| Painel de senhas | http://127.0.0.1:4173/#/painel      |
| Atendimento      | http://127.0.0.1:4173/#/atendimento |
| Administração    | http://127.0.0.1:4173/#/admin       |

Para encerrar, pressione `Ctrl+C`. Se a porta estiver ocupada, use `$env:DEMO_PORT='4174'` antes de iniciar e abra a nova porta.

## PostgreSQL

Com Docker instalado:

```powershell
docker compose up -d db
Copy-Item apps/api/.env.example apps/api/.env
npm.cmd run db:migrate
npm.cmd run db:seed
```

O seed insere somente cortes fictícios sem sobrescrever os existentes. Configure o primeiro gerente antes de usar a administração:

```powershell
$env:ADMIN_NAME=Read-Host 'Nome do gerente'
$env:ADMIN_EMAIL=Read-Host 'E-mail do gerente'
$adminSecret=Read-Host 'Senha (mínimo 10 caracteres)' -AsSecureString
$env:ADMIN_PASSWORD=[System.Net.NetworkCredential]::new('', $adminSecret).Password
try { npm.cmd run admin:create } finally { Remove-Item Env:ADMIN_PASSWORD; $adminSecret=$null }
npm.cmd run dev
```

O comando cria somente o primeiro gerente. Cadastre a equipe pela administração. Frontend: [http://127.0.0.1:5173](http://127.0.0.1:5173). API: [http://127.0.0.1:3001](http://127.0.0.1:3001). O modo PostgreSQL preserva pedidos, histórico, usuários e configurações após reiniciar. As sessões de login duram até 8 horas e são encerradas ao reiniciar a API.

## Arquitetura e validação

React 19 e Vite na interface; Node.js e Express 5 na API; PostgreSQL 17 na persistência. O monorepositório utiliza npm workspaces. Rotas e controllers tratam HTTP; services aplicam as regras; models validam o domínio; repositories concentram SQL e transações.

```powershell
npm.cmd test
npm.cmd run build
```

O CI aplica as migrações duas vezes, carrega o catálogo, testa API e PostgreSQL, mede 200 consultas com 5 clientes, valida backup/restauração em banco isolado e verifica a imagem Docker. Localmente, os testes de PostgreSQL exigem `TEST_DATABASE_URL` e são ignorados quando a variável não existe.

## Documentação

- [Wiki do sistema](https://github.com/kantxlx/AO-PONTO/wiki)
- [Arquitetura e regras](docs/arquitetura.md)
- [Banco de dados](docs/banco-de-dados.md)
- [Execução e uso](docs/execucao.md)
- [Interface, identidade visual e imagens](docs/identidade-visual.md)
- [Implantação, backup e recuperação](docs/operacao.md)
- [Planejamento no Trello](https://trello.com/b/KojhXpU7/ao-ponto)

O valor final dos itens vendidos por peso depende da pesagem no balcão. Pagamentos, emissão fiscal e gestão de estoque não fazem parte dos fluxos do sistema.
