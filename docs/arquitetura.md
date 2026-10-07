# Arquitetura do Ao Ponto

## Organização

O sistema utiliza uma arquitetura web cliente-servidor, com React e Vite na apresentação, Node.js e Express na API e PostgreSQL na persistência. As aplicações são organizadas em npm workspaces.

Os casos de uso seguem o Documento de Arquitetura de Software do Ao Ponto. O UC01 corresponde à consulta do cardápio e o UC02 à seleção de cortes.

| Componente | Responsabilidade |
| --- | --- |
| Frontend | Apresentar o catálogo e gerenciar a seleção de cortes |
| API | Disponibilizar os cortes e tratar falhas de consulta |
| Repositório | Consultar os dados no PostgreSQL |
| Banco de dados | Armazenar nome, descrição, categoria, preço, unidades e disponibilidade dos cortes |
| Módulo de seleção | Validar quantidades e unidades, combinar itens e recuperar a seleção local |

## Consulta do cardápio

O frontend consulta `GET /api/cuts`. A API utiliza uma camada de repositório para acessar o PostgreSQL, mantendo as consultas SQL fora das rotas HTTP.

A interface apresenta os cortes com nome, descrição, preço, unidade e disponibilidade. O catálogo permite filtro por categoria e busca que ignora acentos. Falhas de consulta exibem uma mensagem com opção de tentar novamente.

O modo de demonstração utiliza um catálogo fictício e precisa ser configurado explicitamente. Uma falha no PostgreSQL não ativa esse modo automaticamente.

## Seleção de cortes

A seleção contém o identificador do corte, a unidade e a quantidade. Os preços são obtidos do catálogo e calculados em centavos, com arredondamento do subtotal de cada item.

Quantidades em quilogramas aceitam vírgula ou ponto e até três casas decimais. Quantidades em unidades devem ser inteiras. A quantidade deve ser maior que zero e limitada a 100 por corte e unidade, incluindo adições repetidas. Esse limite pode ser ajustado conforme a regra de negócio.

Somente cortes disponíveis e unidades permitidas podem ser selecionados. Ao carregar novamente o catálogo, a seleção descarta os cortes removidos ou indisponíveis.

O cliente pode adicionar, aumentar, reduzir e remover itens, limpar a seleção e consultar o valor estimado. O valor final dos produtos vendidos por peso depende da pesagem no balcão.

## Armazenamento no navegador

A seleção é armazenada no localStorage para recuperação após recarregar a página. Dados corrompidos são descartados, e preços não são recuperados desse armazenamento.

Esse mecanismo não registra pedidos nem implementa sincronização offline. O UC03 deverá confirmar os dados no servidor, persistir pedido e senha em uma transação e impedir duplicações no reenvio. Em totens compartilhados, a sessão deverá ser limpa após confirmação ou abandono para separar clientes.

## Validação

Os testes de API verificam a consulta do catálogo e o tratamento de falhas. Os testes de seleção verificam quantidades, unidades, indisponibilidade, adições repetidas e recuperação de dados locais.

O GitHub Actions provisiona PostgreSQL 17, aplica a migração e o seed, executa os testes de integração e gera o build do frontend. A execução [37677331929](https://github.com/kantxlx/AO-PONTO/actions/runs/37677331929) validou essas etapas no commit `d398928`.

## Evolução do sistema

Os demais casos de uso abrangem registro de pedidos, fila de preparo, chamadas de senhas, autenticação, administração de cortes e configuração de horários. Também estão previstos comunicação em tempo real, tratamento de falhas de conexão, testes de concorrência e configuração de implantação.

O planejamento é acompanhado no [Trello](https://trello.com/b/KojhXpU7/ao-ponto). Os comandos de instalação, execução e validação estão no [README](../README.md).
