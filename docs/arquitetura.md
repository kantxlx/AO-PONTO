# Arquitetura do Ao Ponto

O sistema utiliza React/Vite, API Express e PostgreSQL, organizados em npm workspaces. As áreas públicas são o cardápio, o painel de senhas e o acompanhamento individual. Atendimento exige login; administração exige perfil de gerente.

## Organização

| Camada                   | Responsabilidade                                                             |
| ------------------------ | ---------------------------------------------------------------------------- |
| `apps/web/src/App.jsx`   | Catálogo, seleção, escolha presencial, confirmação e recuperação de reenvios |
| `apps/web/src/Shell.jsx` | Navegação, sessão, cabeçalho e rodapé compartilhados                         |
| `apps/web/src/pages` | Telas de login, atendimento, administração, painel e acompanhamento |
| `apps/web/src/components` | Diálogo acessível, fotos dos cortes e relógio compartilhados |
| `apps/web/src/format.js` | Formatação e leitura de preços com vírgula ou ponto |
| `apps/web/public/images` | Imagens WebP locais do catálogo e da abertura |
| `routes` e `controllers` | Contratos HTTP, sessões, permissões de acesso e SSE                          |
| `services`               | Casos de uso, autorização, quantidades, horários e transições                |
| `models`                 | Representação de pedido, catálogo e validações de domínio                    |
| `repositories`           | Persistência PostgreSQL e alternativa demonstrativa em memória               |
| `database`               | Pool, timeouts e migrações versionadas                                       |

As consultas SQL ficam nos repositórios; as regras de aplicação ficam nos services. O runtime monta os componentes e mantém o agendamento das chamadas automáticas.

## Pedido e idempotência

A confirmação envia `idempotencyKey` UUID, `inPerson` e itens com `cutId`, `quantity` e `unit`. O servidor verifica o horário, consulta a disponibilidade, valida quantidades e usa o preço do banco. Pedido, itens e senha são gravados na mesma transação.

A chave identifica a tentativa. Um hash do conteúdo normalizado permite recuperar a mesma resposta em reenvios e rejeitar a reutilização da chave para outro pedido. A sequência da senha vem do PostgreSQL; lacunas são possíveis em sequências e não representam perda de pedidos.

## Fila e concorrência

A prioridade é FIFO por número do pedido. Os agrupamentos somam somente o mesmo corte/unidade. Chamadas, reemissões, conclusões, alterações administrativas e confirmação utilizam uma transação com advisory lock `17001009`. Isso coordena processos diferentes conectados ao mesmo banco. O repositório demonstrativo serializa as operações e só publica o estado após sucesso.

Pedidos transitam de `REGISTERED` para `IN_PREPARATION` e `COMPLETED`. Senhas usam `PENDING`, `CALLED`, `FINISHED` e `EXPIRED`. Concluir novamente um pedido concluído devolve o estado existente. Senhas expiradas continuam visíveis à equipe e podem retornar à fila sem trocar o número nem apagar o histórico. As reemissões acumuladas não são zeradas.

## Chamadas e comunicação

O funcionário chama a próxima senha ou repete a chamada até o limite configurado. O modo automático é desativado inicialmente. Quando ativado, o agendador verifica a fila a cada segundo, respeita o horário e o intervalo, repete até o limite e depois expira a senha. Em atendimentos demorados, use o modo manual para evitar expiração durante o preparo.

`/api/events` transmite snapshots do painel por SSE, com verificação a cada 2 segundos, heartbeat e reconexão nativa do EventSource. A interface usa consulta HTTP como alternativa durante reconexão. O painel da equipe atualiza a cada 3 segundos. Não há promessa de latência zero.

## Offline

O service worker guarda interface, assets e as respostas públicas de catálogo/horário em cache. Somente depois de abrir o sistema online e preencher esse cache é possível reabrir o cardápio offline. Login, dados administrativos e respostas dos pedidos não são armazenados no cache.

A confirmação é salva em `localStorage` antes do envio. Uma falha de rede mantém a mesma chave e o mesmo conteúdo. Com o cardápio aberto, a reconexão ou uma verificação a cada 10 segundos tenta confirmar novamente. Até a resposta do servidor, não existe senha emitida. A validação definitiva sempre usa disponibilidade, preço e horário atuais. Em caso de rejeição, a seleção permanece para revisão. O dispositivo precisa permanecer com o navegador aberto; não há envio em segundo plano com o navegador fechado.

## Segurança

Senhas usam scrypt com salt aleatório; as comparações usam tempo constante. As sessões têm tokens aleatórios, cookie HttpOnly/SameSite Strict, duração de 8 horas e flag Secure em produção. Reiniciar a API encerra sessões. Cada acesso consulta o usuário ativo; alterações de conta revogam suas sessões. O último gerente ativo não pode ser desativado ou perder o perfil.

Operações de escrita exigem JSON e validam Origin quando presente. SQL utiliza parâmetros; o corpo HTTP tem limite de 32 KB. O login limita falhas por IP durante 15 minutos. A implantação usa uma única instância da API porque as sessões e os limites de login residem em memória. HTTPS deve terminar no proxy da instalação.

O acompanhamento individual usa um identificador UUID não sequencial e apresenta somente senha, estado e posição aproximada. O QR code é gerado localmente, sem serviços externos. Não contém senha de login, itens ou dados pessoais.

## Validação

Os testes cobrem catálogo, seleção, idempotência concorrente, transações, autorização, histórico, fila, reemissão, expiração, conclusão, horários e carga de 5 clientes/200 consultas. PostgreSQL, Docker e restauração são validados no CI; os comandos estão no [README](../README.md). A publicação em hospedagem real e o ensaio com os equipamentos do estabelecimento são etapas de operação acompanhadas no Trello.
