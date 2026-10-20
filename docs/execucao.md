# Execução e uso

## Preparar o notebook

Instale Node.js 22.12 ou superior, baixe o repositório e abra o terminal na pasta que contém `package.json`. Se já utiliza Git, atualize com `git pull` antes de instalar.

```powershell
npm.cmd ci --include=dev
npm.cmd run demo
```

Abra **http://127.0.0.1:4173**. Mantenha o terminal aberto. Para encerrar, use **Ctrl+C**. Depois da instalação, `iniciar.cmd` executa a demonstração com dois cliques no Windows.

A demonstração usa dados em memória. Qualquer pedido, usuário ou configuração é perdido quando o servidor para. Para persistir dados, configure PostgreSQL e execute as migrações conforme o [README](../README.md).

## Utilizar o sistema

1. No cardápio, busque um corte ou escolha uma categoria. Produtos indisponíveis não podem ser selecionados.
2. Selecione a quantidade. Para testar, `0,500` kg de picanha resulta em R$ 39,95 no catálogo fictício.
3. Clique em **Ir para o carrinho**. Na tela do carrinho, edite as quantidades, remova itens e marque a escolha presencial se desejar escolher a peça no balcão. Use **Continuar escolhendo** para adicionar outros cortes.
4. Confira o total estimado e clique em **Enviar pedido ao açougue**. Após a confirmação do servidor, a senha aparece em tela inteira. Anote ou fotografe o número e acompanhe pelo painel ou QR code. O botão **Novo pedido** libera o totem imediatamente; após 30 segundos, isso acontece automaticamente, sem cancelar o pedido já enviado. A seleção e os filtros são limpos para o próximo cliente. Recarregar durante esses 30 segundos preserva apenas o tempo restante da confirmação.
5. Abra **Atendimento** em outra aba. Na demonstração, entre com `gerente@demo.local` e `DemoAoPonto2026!`.
6. Consulte o agrupamento de cortes, chame a próxima senha e confira a atualização no painel público.
7. Busque por pedido, senha ou corte e filtre a situação da fila. Rechame quando necessário. Ao concluir, confira a janela de confirmação da entrega; o pedido sai dos agrupamentos.
8. Em **Administração**, utilize as seções **Cortes do cardápio**, **Sua equipe** e **Horários e fila**. Cortes arquivados podem ser reativados. Preços aceitam vírgula ou ponto.

No painel público, **Ativar som** habilita um aviso sonoro nas novas chamadas. O navegador exige esse primeiro clique. O botão de tela cheia depende do suporte do navegador. O painel apresenta a chamada atual e as cinco últimas chamadas anteriores, enquanto a API mantém até dez registros recentes.

O QR code utiliza o endereço pelo qual o sistema foi aberto. Um endereço `127.0.0.1` pertence ao próprio aparelho e não abre o notebook em outro celular. Para usar QR entre dispositivos, o sistema deve ter um endereço de rede acessível ou estar publicado com HTTPS.

## Falha de conexão

Abra o sistema online antes de depender do cache offline. Se a conexão falhar durante a confirmação, o pedido fica pendente no navegador. Não é emitida uma senha local. Deixe o cardápio aberto: o sistema tenta novamente na reconexão e a cada 10 segundos enquanto houver uma confirmação pendente. Também há um botão para nova tentativa.

Não limpe os dados do navegador durante uma confirmação pendente. O servidor utiliza a mesma chave para recuperar o pedido sem duplicá-lo. Se o estabelecimento estiver fechado ou um corte tiver sido desativado, a API rejeita o envio para que a seleção seja revisada.

## Problemas comuns

| Problema                         | Como resolver                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `vite` não reconhecido           | Feche as execuções do projeto e execute `npm.cmd ci --include=dev`               |
| PowerShell bloqueia `npm.ps1`    | Use `npm.cmd`                                                                    |
| Porta 4173 ocupada               | Use a execução já aberta ou `$env:DEMO_PORT='4174'` antes de iniciar             |
| Página não abre                  | Confira endereço HTTP e porta indicados no terminal                              |
| Login perdido após reiniciar     | Entre novamente; sessões não sobrevivem ao reinício da API                       |
| Dados sumiram após encerrar demo | Use PostgreSQL para persistência; a demonstração é em memória                    |
| Sem catálogo offline             | É necessário abrir online e completar o cache antes                              |
| Senha expirada                   | A equipe pode usar **Recolocar na fila**; o número e o histórico são preservados |

## Verificações

```powershell
npm.cmd test
npm.cmd run build
```

Os testes PostgreSQL dependem de `TEST_DATABASE_URL`, apontando exclusivamente para um banco de teste com migrações e seed. Nunca configure essa variável com o banco de operação.
