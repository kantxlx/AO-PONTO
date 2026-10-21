# Melhorias recomendadas

As sugestões abaixo são separadas do que já foi corrigido nesta validação. Nenhuma delas foi implementada sem necessidade demonstrada, para preservar os fluxos atuais.

## Prioridade alta

### 1. Teste E2E automatizado do fluxo principal

Hoje os fluxos de interface foram validados manualmente. Um teste com Playwright cobriria:

1. catálogo → seleção → carrinho → envio → senha;
2. login → chamada → conclusão;
3. acompanhamento público após a conclusão;
4. navegação em viewport móvel, incluindo a barra de seções da administração.

Isso exige autorização para adicionar uma dependência de desenvolvimento, instalar navegadores no CI e manter uma massa de teste isolada. Não foi feito nesta etapa.

### 2. Reproduzir a suíte PostgreSQL em ambiente local documentado

Os três testes PostgreSQL são ignorados sem `TEST_DATABASE_URL`. O CI já cobre o banco, mas uma receita local curta reduz o risco de uma alteração de SQL passar apenas com o repositório em memória.

Sugestão: criar um banco `aoponto_test`, aplicar migrações e executar `npm.cmd test -w @ao-ponto/api` com a variável definida. O banco nunca deve ser o de produção.

### 3. Regressão responsiva no CI

As correções desta validação dependem de quebra de navegação e de abas em larguras estreitas. Um teste E2E pode medir `scrollWidth` contra `clientWidth` em 320, 360, 430, 600 e 1150 px para as cinco rotas principais e falhar em caso de overflow.

## Prioridade média

### 4. Avaliação formal de acessibilidade

A interface já usa rótulos, diálogo nativo, foco visível e textos alternativos. Ainda não houve auditoria formal. Recomenda-se:

- executar uma ferramenta automatizada (por exemplo, axe) nas rotas principais;
- testar navegação somente por teclado, foco após troca de rota e leitura dos avisos;
- revisar contraste de textos secundários e tamanhos de alvo em telas de 320 px;
- confirmar se avisos temporários, como “adicionado ao pedido”, são anunciados por leitores de tela.

### 5. Sessões e limite de login em mais de uma instância

Sessões e tentativas de login ficam em memória no processo da API. Isso é adequado ao modo demo e a uma única instância. Se a aplicação for escalada horizontalmente, será necessário usar armazenamento compartilhado para sessões e para o limite de tentativas; caso contrário, cada instância aplica seu próprio limite.

### 6. Limpeza de código sem fluxo ativo

- `apps/web/src/Ticket.jsx` não é importado por nenhuma tela. O CSS de impressão associado também não participa do fluxo atual. Antes de remover, confirme que não há uso externo ou plano de reativação.
- `apps/web/src/App.jsx` repete a normalização de texto que já existe em `format.js`. A duplicação é pequena, mas pode ser unificada em uma alteração isolada.

## Prioridade baixa

### 7. Desempenho e evolução do bundle

O build atual entrega aproximadamente 321 kB de JavaScript (101 kB gzip) e 74 kB de CSS (15 kB gzip). Para o totem e o painel, o tamanho é aceitável. Se novas telas ou bibliotecas forem adicionadas, vale medir novamente e considerar divisão por rota ou carregamento sob demanda.

### 8. Ampliar a observabilidade operacional

O sistema já expõe `/api/health` e `/api/ready`. Para produção, pode ser útil acompanhar latência de chamadas, quantidade de senhas expiradas e falhas de SSE sem registrar dados pessoais ou cookies. Isso depende da infraestrutura escolhida e não é necessário para o modo demo.

## O que não foi feito

- Nenhuma dependência nova foi instalada.
- Nenhum comando foi executado contra banco de produção.
- Nenhuma funcionalidade foi alterada além dos dois ajustes de CSS responsivo.
- Não houve teste em aparelho físico nem auditoria WCAG formal.
- O QR code e o modo offline continuam sujeitos às limitações de origem e de rede descritas em [execucao.md](execucao.md) e [testes.md](testes.md).
