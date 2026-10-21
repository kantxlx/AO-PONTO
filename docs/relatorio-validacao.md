# Relatório de validação

## Resumo executivo

A validação foi concluída na branch `testes/validacao`, criada a partir de `main` no commit `d631d7a`. A branch principal não foi alterada.

**Resultado: aprovado com ressalvas.** Os fluxos principais funcionam, a suíte automatizada passou e o build foi gerado. Dois defeitos de responsividade foram encontrados e corrigidos. A ressalva principal é que os testes PostgreSQL não puderam ser executados localmente por falta de `TEST_DATABASE_URL`, e ainda não existe teste E2E automatizado com navegador.

## Escopo validado

- Catálogo, busca, seleção de quantidade, carrinho e confirmação.
- Registro de pedido com preço calculado no servidor e proteção contra reenvio.
- Senha e QR code de acompanhamento.
- Login de gerente, fila, chamada, reemissão e conclusão.
- Painel público e acompanhamento individual.
- Administração de cortes, usuários e configurações.
- Contrato HTTP, sessão, origem, JSON inválido, rota inexistente e limite de login.
- Layout responsivo das cinco rotas principais em 13 larguras.

## Defeitos encontrados e corrigidos

### Navegação móvel

Com quatro links de gerente, a navegação ultrapassava a viewport entre 320 e 414 px. Em 320 px, a página tinha 347 px de largura contra 305 px úteis. A navegação agora quebra em duas linhas até 430 px, e o `scroll-margin-top` do catálogo foi ajustado para o cabeçalho mais alto.

### Abas da administração

Em 320 px, a barra com três seções ultrapassava a página em 19 px. As abas agora quebram em mais de uma linha até 430 px. A tabela administrativa continua com rolagem interna, sem alargar a página.

Detalhes e medições estão em [responsividade.md](responsividade.md).

## Evidências

### Testes automatizados

| Suíte             | Aprovados | Falhas | Ignorados |
| ----------------- | --------- | ------ | --------- |
| API (`node:test`) | 14        | 0      | 3         |
| Web (`node:test`) | 11        | 0      | 0         |
| **Total**         | **25**    | **0**  | **3**     |

Os três ignorados são os testes PostgreSQL, dependentes de `TEST_DATABASE_URL`. A suíte cobre catálogo, carrinho, preço, idempotência, fila, chamadas, administração, sessão, HTTP, carga e integridade do esquema. A cobertura está detalhada em [testes.md](testes.md).

### Build

`npm.cmd run build` concluiu com Vite 7.3.7:

- JavaScript: 321,04 kB (101,08 kB gzip);
- CSS: 73,95 kB (15,33 kB gzip).

### Smoke HTTP

No modo demo, responderam conforme esperado: `/api/health`, `/api/cuts`, `/api/status`, `/api/display`, criação de pedido, login, `/api/operations`, chamada, conclusão, acompanhamento, sessão e logout. O pedido de teste de 0,500 kg de picanha totalizou R$ 39,95.

### Teste funcional de interface

- Catálogo carregou oito cortes.
- Picanha de 0,500 kg foi adicionada ao carrinho por R$ 39,95.
- O pedido foi enviado e a senha `007` apareceu com QR code e contagem de 30 segundos.
- A sessão de gerente acessou o atendimento; a chamada e a conclusão da senha `002` atualizaram os indicadores.
- A administração abriu as três seções e exibiu oito cortes, um usuário e sete dias de horário.
- O painel público mostrou a senha `004` em atendimento, três senhas aguardando e o histórico.
- O acompanhamento da senha `002` mostrou “Atendimento concluído”.

### Responsividade

Foram medidas cinco rotas em 13 larguras, totalizando 65 combinações. Após as correções, nenhuma apresentou rolagem horizontal da página. A tabela administrativa mantém rolagem interna intencional.

## Riscos e pendências

| Item                                 | Impacto                                                       | Encaminhamento                                                |
| ------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------- |
| `TEST_DATABASE_URL` ausente          | Testes de SQL e restrições não rodaram nesta máquina          | Executar em banco isolado antes de alterações de persistência |
| Sem E2E automatizado                 | Regressões de interface dependem de verificação manual        | Avaliar Playwright, com autorização para nova dependência     |
| Sem aparelho físico                  | Safari/iOS, teclado virtual e modo paisagem não foram medidos | Repetir a matriz em dispositivo real                          |
| QR code em `127.0.0.1`               | Não abre em outro celular                                     | Usar endereço de LAN ou HTTPS para teste entre dispositivos   |
| Sessões e limite de login em memória | Não são compartilhados entre instâncias                       | Usar armazenamento compartilhado se houver escala horizontal  |
| Dados do modo demo em memória        | Reiniciar o servidor apaga pedidos, usuários e configurações  | Usar PostgreSQL para persistência                             |

## Conclusão

A branch está pronta para revisão. Os fluxos existentes foram preservados; as únicas alterações de comportamento visual são as quebras controladas da navegação e das abas em telas de até 430 px. Antes de uma implantação definitiva, recomenda-se executar a suíte PostgreSQL em banco isolado, repetir a validação em aparelho físico e decidir sobre a automação E2E.

Documentos relacionados: [testes.md](testes.md), [responsividade.md](responsividade.md) e [melhorias.md](melhorias.md).
