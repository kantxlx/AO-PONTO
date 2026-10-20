# Interface e identidade visual

A identidade do Ao Ponto segue um açougue tradicional: vermelho vinho nas ações, madeira nas imagens, fundo marfim e títulos com serifa. A mesma linguagem aparece no cardápio, no atendimento, na administração e no painel público.

## Experiência de uso

- Cardápio com fotografias ilustrativas locais, busca, categorias, ordenação e filtro de disponibilidade.
- Quantidades sugeridas, subtotal imediato, edição do carrinho e revisão antes de emitir a senha.
- Resumo fixo no notebook e gaveta de pedido no celular; comprovante recuperado na mesma aba após recarregar.
- Atendimento com indicadores, busca por senha/pedido/corte, filtros de situação e confirmação da entrega.
- Administração separada em catálogo, equipe e horários; edição em diálogos e recuperação de cortes arquivados.
- Painel com chamada em destaque, histórico recente, relógio e aviso sonoro opcional.
- Diálogos com foco, fechamento por Escape e retorno ao controle de origem. As telas se adaptam ao celular.

## Imagens

As nove imagens foram geradas pelo recurso integrado de geração de imagens (modo: geração de imagem nova), e exportadas para WebP, sem alteração de composição. Não representam fotografias do estoque de um estabelecimento. A interface as identifica como ilustrativas.

Os arquivos finais estão em `apps/web/public/images/` (aproximadamente 2 MB no total). São servidos pelo próprio sistema e incluídos no cache público após o primeiro acesso online. Novos cortes sem imagem associada recebem um ícone de fallback; o cadastro não inclui upload de fotografias.

Os textos abaixo registram os prompts enviados para geração de cada arquivo:

### hero.webp

Caminho: `apps/web/public/images/hero.webp`

```text
Use case: photorealistic-natural. Asset type: wide hero photograph for a traditional Brazilian butcher shop web app named Ao Ponto. Create a premium editorial food photograph in horizontal landscape composition, 1536x1024. A thick fresh uncooked Brazilian picanha cut with a clean ivory fat cap and three tidy slices on an aged dark walnut butcher cutting board, rosemary sprigs, a few peppercorns and coarse salt. Warm side lighting, rich burgundy meat tones, authentic visible wood grain, deep charcoal brown background. The food fills the center and right, atmospheric darker empty space on the left. Crisp realistic textures, appetizing hygienic retail presentation, tasteful rustic butcher aesthetic. No people, no hands, no blood puddles, no knives, no letters, no labels, no logos or watermark.
```

### picanha.webp

Caminho: `apps/web/public/images/picanha.webp`

```text
Use case: product-mockup. Asset type: single square product photograph for a traditional Brazilian butcher shop online catalog. Subject: Brazilian picanha (rump cap), a triangular deep red beef cut with a thick clean creamy fat cap, two slices leaning neatly beside it. Premium realistic food photography, viewed at a 45 degree elevated angle, meat centered on a small round aged walnut cutting board on a neutral warm ivory kitchen countertop. Small rosemary sprig and a few peppercorns at one corner. Bright soft window light, warm authentic wood grain, appetizing clean butcher-shop retail presentation, premium magazine styling. The entire main product stays within the central 65 percent so it can be cropped into a landscape card. The same neutral ivory backdrop and warm wooden board style as a coherent product catalog. No cooking, no sear marks, no packaging, no people, no hands, no blood puddles, no knife, no text, no letters, no watermark. 1024x1024 square.
```

### alcatra.webp

Caminho: `apps/web/public/images/alcatra.webp`

```text
Use case: product-mockup. Asset type: single square product photograph for a traditional Brazilian butcher shop online catalog. Subject: Brazilian alcatra (top sirloin), two thick fresh red sirloin steaks with thin edge fat and subtle marbling. Premium realistic food photography, viewed at a 45 degree elevated angle, meat centered on a small round aged walnut cutting board on a neutral warm ivory kitchen countertop. Small rosemary sprig and a few peppercorns at one corner. Bright soft window light, warm authentic wood grain, appetizing clean butcher-shop retail presentation, premium magazine styling. The entire main product stays within the central 65 percent so it can be cropped into a landscape card. The same neutral ivory backdrop and warm wooden board style as a coherent product catalog. No cooking, no sear marks, no packaging, no people, no hands, no blood puddles, no knife, no text, no letters, no watermark. 1024x1024 square.
```

### patinho.webp

Caminho: `apps/web/public/images/patinho.webp`

```text
Use case: product-mockup. Asset type: single square product photograph for a traditional Brazilian butcher shop online catalog. Subject: Brazilian patinho (beef knuckle), neat lean deep red round steaks with very little fat. Premium realistic food photography, viewed at a 45 degree elevated angle, meat centered on a small round aged walnut cutting board on a neutral warm ivory kitchen countertop. Small rosemary sprig and a few peppercorns at one corner. Bright soft window light, warm authentic wood grain, appetizing clean butcher-shop retail presentation, premium magazine styling. The entire main product stays within the central 65 percent so it can be cropped into a landscape card. The same neutral ivory backdrop and warm wooden board style as a coherent product catalog. No cooking, no sear marks, no packaging, no people, no hands, no blood puddles, no knife, no text, no letters, no watermark. 1024x1024 square.
```

### costela.webp

Caminho: `apps/web/public/images/costela.webp`

```text
Use case: product-mockup. Asset type: single square product photograph for a traditional Brazilian butcher shop online catalog. Subject: Brazilian costela bovina (beef short ribs), a tidy uncooked rack cut with four visible rib bones and rich marbled red meat. Premium realistic food photography, viewed at a 45 degree elevated angle, meat centered on a small round aged walnut cutting board on a neutral warm ivory kitchen countertop. Small rosemary sprig and a few peppercorns at one corner. Bright soft window light, warm authentic wood grain, appetizing clean butcher-shop retail presentation, premium magazine styling. The entire main product stays within the central 65 percent so it can be cropped into a landscape card. The same neutral ivory backdrop and warm wooden board style as a coherent product catalog. No cooking, no sear marks, no packaging, no people, no hands, no blood puddles, no knife, no text, no letters, no watermark. 1024x1024 square.
```

### lombo.webp

Caminho: `apps/web/public/images/lombo.webp`

```text
Use case: product-mockup. Asset type: single square product photograph for a traditional Brazilian butcher shop online catalog. Subject: a fresh uncooked boneless pork loin roast with two neatly arranged pale pink loin medallions. Premium realistic food photography, viewed at a 45 degree elevated angle, food centered on a small round aged walnut cutting board on a neutral warm ivory kitchen countertop. Small rosemary sprig and a few peppercorns at one corner. Bright soft window light, warm authentic wood grain, appetizing clean butcher-shop retail presentation, premium magazine styling. The entire main product stays within the central 65 percent so it can be cropped into a landscape card. The same neutral ivory backdrop and warm wooden board style as a coherent product catalog. No cooking, no sear marks, no packaging, no people, no hands, no blood puddles, no knife, no text, no letters, no watermark. 1024x1024 square.
```

### linguica.webp

Caminho: `apps/web/public/images/linguica.webp`

```text
Use case: product-mockup. Asset type: single square product photograph for a traditional Brazilian butcher shop online catalog. Subject: a neat coil of six fresh uncooked Brazilian linguica toscana pork sausages, plump pink sausages with natural casing. Premium realistic food photography, viewed at a 45 degree elevated angle, food centered on a small round aged walnut cutting board on a neutral warm ivory kitchen countertop. Small rosemary sprig and a few peppercorns at one corner. Bright soft window light, warm authentic wood grain, appetizing clean butcher-shop retail presentation, premium magazine styling. The entire main product stays within the central 65 percent so it can be cropped into a landscape card. The same neutral ivory backdrop and warm wooden board style as a coherent product catalog. No cooking, no sear marks, no packaging, no people, no hands, no blood puddles, no knife, no text, no letters, no watermark. 1024x1024 square.
```

### peito-frango.webp

Caminho: `apps/web/public/images/peito-frango.webp`

```text
Use case: product-mockup. Asset type: single square product photograph for a traditional Brazilian butcher shop online catalog. Subject: three fresh uncooked skinless boneless chicken breast fillets, natural pale pink color. Premium realistic food photography, viewed at a 45 degree elevated angle, food centered on a small round aged walnut cutting board on a neutral warm ivory kitchen countertop. Small rosemary sprig and a few peppercorns at one corner. Bright soft window light, warm authentic wood grain, appetizing clean butcher-shop retail presentation, premium magazine styling. The entire main product stays within the central 65 percent so it can be cropped into a landscape card. The same neutral ivory backdrop and warm wooden board style as a coherent product catalog. No cooking, no sear marks, no packaging, no people, no hands, no blood puddles, no knife, no text, no letters, no watermark. 1024x1024 square.
```

### frango-inteiro.webp

Caminho: `apps/web/public/images/frango-inteiro.webp`

```text
Use case: product-mockup. Asset type: single square product photograph for a traditional Brazilian butcher shop online catalog. Subject: one fresh uncooked whole plucked retail chicken, neatly trussed for roasting, pale clean skin, ready-to-cook retail presentation. Premium realistic food photography, viewed at a 45 degree elevated angle, food centered on a small round aged walnut cutting board on a neutral warm ivory kitchen countertop. Small rosemary sprig and a few peppercorns at one corner. Bright soft window light, warm authentic wood grain, appetizing clean butcher-shop retail presentation, premium magazine styling. The entire main product stays within the central 65 percent so it can be cropped into a landscape card. The same neutral ivory backdrop and warm wooden board style as a coherent product catalog. No cooking, no sear marks, no packaging, no people, no hands, no blood puddles, no knife, no text, no letters, no watermark. 1024x1024 square.
```

