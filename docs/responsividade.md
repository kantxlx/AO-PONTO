# Responsividade

## Escopo

A auditoria cobriu as cinco rotas principais do sistema:

- `#/` — catálogo e totem;
- `#/painel` — painel público de senhas;
- `#/atendimento` — fila e preparo, com sessão de gerente;
- `#/admin` — administração, com sessão de gerente;
- `#/pedido/:id` — acompanhamento individual.

As larguras verificadas foram: **320, 360, 390, 414, 430, 600, 768, 900, 1024, 1150, 1151, 1280 e 1600 px**. Os 65 pares rota × largura foram medidos no build de produção.

## Método

Para cada combinação, a página foi carregada em uma viewport de largura exata e foram coletados:

- `document.documentElement.scrollWidth` comparado a `clientWidth` — detecta rolagem horizontal da página;
- posição e largura dos elementos que ultrapassam os limites da viewport;
- quantidade de linhas da navegação;
- largura interna de tabelas e contêineres com rolagem própria.

A barra de rolagem do navegador reduz cerca de 15 px da largura útil. Por isso, as comparações usam `clientWidth`, e não apenas a largura nominal da janela. A tabela administrativa tem rolagem horizontal interna intencional; ela não é contabilizada como overflow da página.

## Defeitos encontrados e correções

### 1. Navegação com quatro links em telas estreitas

Com sessão de gerente, a navegação exibe quatro links: **Cardápio**, **Painel de senhas**, **Atendimento** e **Administração**. Em larguras de 320 a 414 px, os links não cabiam em uma linha e ultrapassavam a viewport:

| Largura | `clientWidth` | `scrollWidth` antes | Excesso |
| ------- | ------------- | ------------------- | ------- |
| 320 px  | 305 px        | 347 px              | 42 px   |
| 360 px  | 345 px        | 367 px              | 22 px   |

A correção em `apps/web/src/styles.css`, em `@media (max-width: 430px)`, permite que a navegação quebre em duas linhas:

```css
.app-navigation {
  height: auto;
  flex-wrap: wrap;
  gap: 0;
}
.app-navigation a {
  flex: 1 1 50%;
}
```

O cabeçalho passa a ter 154 px nessa faixa. O `scroll-margin-top` do catálogo foi ajustado para 185 px para que o título não fique sob o cabeçalho fixo.

### 2. Barra de seções da administração em 320 px

A barra com **Cortes do cardápio**, **Sua equipe** e **Horários e fila** não quebrava e o último botão ultrapassava a página:

| Largura | `clientWidth` | `scrollWidth` antes | Excesso |
| ------- | ------------- | ------------------- | ------- |
| 320 px  | 305 px        | 324 px              | 19 px   |

A correção em `apps/web/src/operations-responsive.css`, também em `@media (max-width: 430px)`, permite a quebra da barra:

```css
.section-tabs {
  flex-wrap: wrap;
  justify-content: flex-start;
  row-gap: 2px;
}
```

A tabela de cortes e a de usuários continuam usando `.table-scroll` com `overflow-x: auto` e largura mínima de 520 px. Isso mantém as colunas legíveis em vez de comprimi-las; a rolagem fica restrita à tabela.

## Resultado após as correções

Os 65 pares rota × largura passaram sem rolagem horizontal da página. Não restaram elementos ultrapassando a viewport fora dos contêineres com rolagem intencional.

| Faixa            | Comportamento observado                                                           |
| ---------------- | --------------------------------------------------------------------------------- |
| Até 430 px       | Catálogo em uma coluna; navegação em duas linhas; abas da administração quebradas |
| 600 px           | Catálogo em duas colunas; conteúdo operacional empilhado                          |
| 768 a 900 px     | Catálogo em três colunas; cabeçalho e formulários reorganizados                   |
| 1024 a 1150 px   | Layout operacional em duas colunas; catálogo em três colunas até 1100 px          |
| Acima de 1150 px | Catálogo em quatro colunas; navegação e painéis em linha                          |

As tabelas administrativas permanecem roláveis dentro do próprio contêiner em todas as larguras móveis. O painel público mantém a senha em destaque e a lista de espera em uma coluna nas telas estreitas.

## Limitações

- A medição foi feita em navegador desktop com viewport simulada. Aparelhos físicos, Safari/iOS, teclado virtual, modo paisagem e áreas seguras (_safe areas_) ainda precisam de conferência.
- Zoom de 200% e fontes ampliadas podem produzir quebras diferentes das medidas em 100%.
- A auditoria verifica overflow e organização visual, não substitui uma avaliação formal de acessibilidade WCAG.
- O QR code do totem usa a origem aberta no navegador. `127.0.0.1` funciona apenas na mesma máquina; outro celular precisa de endereço de LAN ou HTTPS.
- O teste de funcionamento offline depende de build de produção e de uma origem compatível com service worker.

## Próximos passos recomendados

1. Repetir a matriz em aparelhos físicos e no Safari iOS.
2. Automatizar as larguras 320, 360, 430, 600 e 1150 em um teste E2E, se Playwright for autorizado.
3. Incluir verificação de overflow horizontal no CI para evitar regressões de navegação e abas.
