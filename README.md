# Ao Ponto

Sistema de autoatendimento e organização de pedidos para açougues.

A aplicação permite consultar o cardápio e selecionar cortes por quantidade e unidade. O registro de pedidos e a emissão de senhas estão previstos no UC03.

## Tecnologias e estrutura

- React 19 com Vite: interface do totem.
- Node.js e Express 5: API e futura camada de regras de negócio.
- PostgreSQL 17: catálogo persistido.
- npm workspaces: instalação única e aplicações separadas.
- Testes com o runner nativo do Node.js e CI com GitHub Actions.

```text
apps/
  api/
    database/          esquema SQL
    scripts/           migração e carga de desenvolvimento
    src/
      data/            catálogo fictício de demonstração
      repositories/    acesso ao PostgreSQL
      app.js           aplicação HTTP testável
      config.js        configuração por ambiente
      server.js        inicialização do servidor
    test/              testes de API e integração PostgreSQL
  web/
    src/               interface e regras de seleção
    test/              testes de quantidade e recuperação da seleção
docs/                  documentação técnica
scripts/               execução conjunta das aplicações
.github/workflows/     validação automática
```

## Executar localmente

Pré-requisitos: Node.js 22.12 ou superior e npm. Execute os comandos na raiz do repositório.

```powershell
npm ci
```

### Demonstração sem banco de dados

```powershell
$env:CATALOG_SOURCE='demo'
npm run dev
```

Abra http://127.0.0.1:5173. O catálogo e os preços são fictícios e a interface identifica esse modo. Nenhum pedido é gravado ou enviado. A seleção é mantida no localStorage deste navegador; isso não implementa a sincronização offline de pedidos descrita na arquitetura.

### Desenvolvimento com PostgreSQL

Com Docker instalado:

```powershell
docker compose up -d db
Copy-Item apps/api/.env.example apps/api/.env
Remove-Item Env:CATALOG_SOURCE -ErrorAction SilentlyContinue
npm run db:migrate
npm run db:seed
npm run dev
```

Também é possível usar PostgreSQL instalado diretamente e ajustar `DATABASE_URL` em `apps/api/.env`. O seed insere dados fictícios sem sobrescrever cortes existentes. Execute-o apenas em bancos de desenvolvimento. As credenciais do compose são exclusivamente locais; configure outras credenciais antes de uma implantação real.

Frontend: http://127.0.0.1:5173. API: http://127.0.0.1:3001.

## Funcionalidades

### UC01 — Consultar cardápio

- Catálogo obtido por `GET /api/cuts`.
- Nome, descrição, categoria, preço e unidade de cada corte.
- Filtro por categoria e busca que ignora acentos.
- Indicação de indisponibilidade, carregamento, busca vazia e erro com opção de repetir.
- Fonte PostgreSQL ou demonstração explicitamente configurada. Não há fallback silencioso quando o banco falha.

### UC02 — Selecionar corte

- Seleção em modal com navegação por teclado.
- Quantidade em kg com até 3 casas decimais, aceitando vírgula ou ponto.
- Quantidade inteira para unidades. Somente unidades permitidas pelo corte.
- Limite inicial de 100 por item/unidade, incluindo adições repetidas (premissa a validar com o negócio).
- Adição, aumento, redução, remoção, limpeza e total estimado.
- Seleção recuperada ao recarregar. Dados corrompidos são descartados e preços são sempre obtidos do catálogo.
- Itens removidos ou indisponíveis são retirados após nova consulta do catálogo.
- Aviso quando o navegador não permite salvar a seleção.

## Validar

```powershell
npm test
npm run build
```

Para executar também o teste de integração, use um banco de teste isolado com migração e seed aplicados:

```powershell
$env:TEST_DATABASE_URL='postgresql://aoponto:local_dev_only@localhost:5432/aoponto'
npm test
```

Sem `TEST_DATABASE_URL`, o teste PostgreSQL é explicitamente ignorado. O workflow do GitHub provisiona PostgreSQL 17, aplica migração e seed, executa os testes e gera o build. O status do workflow deve ser verificado no GitHub; configuração de CI não equivale a uma execução aprovada.

O Rollup utiliza a distribuição WebAssembly oficial por compatibilidade com ambientes Windows que restringem módulos nativos.

## Funcionalidades previstas

- Não há autenticação, administração de cortes, pedidos persistidos, senhas, fila ou atualização dos painéis em tempo real.
- O localStorage contém somente uma seleção, não um pedido confirmado. Não oferece acesso offline ao catálogo nem garante durabilidade.
- O UC03 deverá validar disponibilidade, quantidade e preço no servidor, registrar pedido e senha em transação e impedir duplicações.
- Em um totem compartilhado, o UC03 também deverá limpar a sessão após confirmação ou abandono para separar clientes.
- O layout foi inspirado nos requisitos do PDF; não é uma reprodução exata dos protótipos.
- Os servidores de desenvolvimento usam loopback. Publicação e acesso pela rede do açougue precisam de configuração própria, HTTPS e revisão de implantação.

Veja [a documentação técnica](docs/arquitetura.md) para detalhes da arquitetura e das regras de seleção.
