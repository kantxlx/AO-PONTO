# Ao Ponto

Aplicação web para autoatendimento e organização do atendimento em açougues.

O projeto contempla três áreas: totem para clientes, painel operacional para funcionários e administração para o gerente. O fluxo de atendimento envolve consulta de cortes, seleção de quantidades, registro de pedidos e acompanhamento por senhas.

## Tecnologias

- React 19 e Vite na interface.
- Node.js e Express 5 na API.
- PostgreSQL 17 na persistência.
- npm workspaces na organização do repositório.
- Node.js Test Runner e GitHub Actions na validação.

## Executar

Requisitos: Node.js 22.12 ou superior e npm. Abra o terminal na pasta que contém `package.json`.

```powershell
npm.cmd ci --include=dev
npm.cmd run demo
```

Acesse **http://127.0.0.1:4173** e mantenha o terminal aberto. Para encerrar, pressione **Ctrl+C**.

No Windows, após instalar as dependências, também é possível iniciar com dois cliques em `iniciar.cmd`.

O modo de demonstração disponibiliza o cardápio e a seleção de cortes com dados fictícios. Interface e API usam a mesma porta e dispensam PostgreSQL e internet durante o uso. A instalação das dependências requer internet.

Se `vite` não for reconhecido, encerre os servidores locais e execute novamente `npm.cmd ci --include=dev` na raiz do projeto.

## Catálogo e seleção

- Cortes com nome, descrição, categoria, preço e unidade.
- Busca sem distinção de acentos e filtros por categoria.
- Indicação de indisponibilidade.
- Quantidades em quilogramas ou unidades, conforme o corte.
- Validação de quantidade e soma de seleções repetidas.
- Alteração, remoção e limpeza dos itens.
- Total estimado e recuperação da seleção após recarregar.

O valor final dos produtos vendidos por peso depende da pesagem no balcão. A seleção no navegador representa os itens escolhidos; pedido confirmado e senha pertencem ao fluxo de registro descrito na documentação técnica.

## PostgreSQL

Configure `DATABASE_URL` em `apps/api/.env`. Com Docker instalado:

```powershell
docker compose up -d db
Copy-Item apps/api/.env.example apps/api/.env
Remove-Item Env:CATALOG_SOURCE -ErrorAction SilentlyContinue
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Frontend: **http://127.0.0.1:5173**. API: **http://127.0.0.1:3001**.

O seed contém dados fictícios de desenvolvimento. As credenciais locais do Docker Compose devem ser substituídas em uma implantação real.

## Estrutura

```text
apps/api/          API, persistência e testes
apps/web/          interface e regras de seleção
docs/              documentação técnica
scripts/           inicialização das aplicações
.github/workflows/ validação automática
```

## Testes e build

```powershell
npm.cmd test
npm.cmd run build
```

O teste de integração requer `TEST_DATABASE_URL` apontando para um banco de teste com migração e seed aplicados. Sem essa variável, ele é ignorado. O GitHub Actions executa os testes com PostgreSQL e gera o build.

## Documentação

- [Arquitetura e regras de negócio](docs/arquitetura.md)
- [Instalação no notebook e demonstração](docs/execucao.md)
- [Planejamento no Trello](https://trello.com/b/KojhXpU7/ao-ponto)
