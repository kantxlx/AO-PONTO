# Entrega 01 — Estrutura, UC01 e UC02

Data: 07/10/2026.

## Escopo e referência

Implementação inicial baseada no Documento de Arquitetura Ao Ponto fornecido pelo usuário. O repositório estava vazio. Não foi possível ler os cartões do Trello porque o acesso solicitou login; por isso, os detalhes específicos de aceitação dos cartões ainda precisam ser conferidos. Os identificadores UC01 e UC02 seguem os casos de uso do PDF.

## O que foi feito

| Item | Implementação |
| --- | --- |
| Estrutura | npm workspaces, frontend React/Vite, API Express, configuração por ambiente e separação da persistência |
| Banco | Esquema de cortes, script de migração e seed fictício para PostgreSQL 17 |
| UC01 | Catálogo via API, categorias, busca, preços, unidades, indisponibilidade, carregamento e tratamento de falhas |
| UC02 | Modal de seleção, quantidade validada, operações na seleção, preço estimado e recuperação no navegador |
| Qualidade | Testes de API e regras de seleção, build e workflow com PostgreSQL |

## Como foi feito

O frontend consulta a API Express. A API utiliza um repositório para ler cortes do PostgreSQL, mantendo consultas SQL fora das rotas. O modo de demonstração é explícito e lê um catálogo fictício.

As regras de quantidade estão em um módulo independente e testável. O estado da seleção contém apenas identificador, unidade e quantidade; os valores monetários são calculados em centavos a partir do catálogo. Ao consultar novamente o catálogo, itens indisponíveis são retirados.

A seleção fica no navegador para sobreviver a um recarregamento. Não foi implementada a fila offline de pedidos. A geração de senhas pertence ao UC03 e requer confirmação pelo backend.

## Validação

- Seis testes de API e seleção passaram localmente.
- Build de produção gerado com sucesso.
- Auditoria das dependências sem vulnerabilidades conhecidas na verificação inicial.
- Verificação no navegador: catálogo carregado, indisponibilidade bloqueada, seleção de 0,500 kg de picanha, total estimado de R$ 39,95 e recuperação após recarregar.
- Teste de integração PostgreSQL preparado, mas não executado localmente por ausência de servidor PostgreSQL/Docker. O CI foi configurado para executar esse teste com banco isolado.
- CI remoto concluído com sucesso no commit `d398928`: migração, seed, testes (incluindo integração PostgreSQL) e build aprovados. Execução: https://github.com/kantxlx/AO-PONTO/actions/runs/37677331929.

## Atualização externa

Trello atualizado em 07/10/2026: 24 cartões criados com descrições, dependências e critérios de aceite (14 casos de uso, 8 tarefas técnicas e 2 definições de escopo dos protótipos). UC01, UC02 e TEC01 estão em CONCLUIDO; UC03 e TEC08 (homologação) estão em BACKLOG DA SPRINT; os outros 19 estão em PRODUCT BACKLOG. EM ANDAMENTO e TESTE estão vazios porque não há implementação ativa ou validação técnica pendente nesta entrega. Quadro: https://trello.com/b/KojhXpU7/ao-ponto.

GitHub: entrega enviada para `main`, organizada em commits por estrutura e caso de uso. Publicação confirmada no repositório e CI aprovado.

## Próxima etapa

UC03 — Registrar pedido: contrato da API, tabelas de pedidos e itens, transação para emissão de senha, idempotência, confirmação no totem e separação de sessões entre clientes. O TEC08 acompanha a homologação dos detalhes e da interface do UC01/UC02 com o usuário.
