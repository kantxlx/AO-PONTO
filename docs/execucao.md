# Execução e demonstração

## Preparar o notebook

1. Instale o [Node.js LTS](https://nodejs.org/en/download). O projeto requer Node.js 22.12 ou superior; Node.js 24 LTS é uma opção compatível.
2. Baixe o código no [GitHub](https://github.com/kantxlx/AO-PONTO): clique em **Code → Download ZIP** e extraia a pasta. Se já tiver uma cópia Git, atualize com `git pull`.
3. Abra o terminal na pasta que contém `package.json`, `apps` e `iniciar.cmd`.
4. Com internet disponível, instale as dependências:

```powershell
npm.cmd ci --include=dev
```

5. Inicie:

```powershell
npm.cmd run demo
```

6. Abra **http://127.0.0.1:4173** no Chrome ou Edge. Mantenha o terminal aberto durante o uso. Para encerrar, pressione **Ctrl+C**.

No Windows, depois da instalação, `iniciar.cmd` executa o mesmo comando com dois cliques. No macOS/Linux, use `npm ci` e `npm run demo`.

O build é gerado a cada início para usar o código atual. O servidor disponibiliza frontend e API na mesma porta. A demonstração não requer PostgreSQL, Docker, login nem internet depois de instalar as dependências. Ela usa um catálogo fictício identificado na interface.

## Roteiro de demonstração

1. Explique o objetivo: organizar o autoatendimento de um açougue, com totem, painel dos funcionários e painel de senhas.
2. Mostre a arquitetura: React no frontend, API Express e PostgreSQL previsto para os dados persistidos. O catálogo demonstrativo substitui a consulta ao banco somente neste modo de execução.
3. Apresente o UC01: percorra o catálogo, filtre por categoria e busque `linguica` para mostrar a busca sem acentos.
4. Mostre que o frango inteiro está indisponível e não pode ser selecionado.
5. Apresente o UC02: selecione picanha, informe `0,500` kg e confira o subtotal de R$ 39,95.
6. Adicione alcatra, altere a quantidade, remova um item e explique o total estimado.
7. Recarregue a página para demonstrar a recuperação da seleção no navegador. Ao terminar, clique em **Limpar seleção**.
8. Apresente os próximos fluxos no Trello: registro do pedido, emissão de senha, atendimento e administração.

O fluxo demonstrável termina na seleção. Pedido confirmado, emissão de senha, autenticação e painéis em tempo real ainda não estão disponíveis. A recuperação da seleção no navegador não representa sincronização de pedidos offline.

## Conferência antes de usar

- Faça a instalação e teste no próprio notebook com antecedência.
- Execute `npm.cmd test` e `npm.cmd run build` para conferir testes e compilação.
- Inicie a demonstração, desconecte a internet e confirme que o catálogo e a seleção continuam funcionando.
- Limpe a seleção antes de começar. Use F11 se desejar colocar o navegador em tela cheia.
- Mantenha o terminal aberto e leve a pasta com as dependências já instaladas nesse notebook. Não é necessário executar a instalação a cada uso.

## Problemas comuns

| Problema                                 | Como resolver                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `node` ou `npm` não encontrado           | Instale Node.js LTS e reabra o terminal                                                                      |
| PowerShell bloqueia `npm.ps1`            | Use `npm.cmd` nos comandos; não precisa mudar a política do Windows                                          |
| `package.json` não encontrado            | Abra o terminal na pasta extraída que contém esse arquivo                                                    |
| Dependências ausentes                    | Execute `npm.cmd ci --include=dev` com internet antes de usar                                                              |
| Porta 4173 ocupada                       | Encerre a outra execução; ou use `$env:DEMO_PORT='4174'` antes de `npm.cmd run demo` e abra a porta indicada |
| Página não abre                          | Confira se o terminal mostra o endereço e se continua aberto; use HTTP no endereço local                     |
| Seleção de demonstração anterior aparece | Clique em **Limpar seleção**                                                                                 |

Para desenvolvimento com PostgreSQL, siga a seção correspondente no [README](../README.md).

