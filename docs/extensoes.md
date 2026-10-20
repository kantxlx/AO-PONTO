# Escopo do monitoramento e acompanhamento

## EXT01 — Monitoramento

O painel autenticado de atendimento apresenta quatro indicadores operacionais: senhas aguardando, senhas em atendimento, senhas expiradas e grupos de corte/unidade em preparo. Os valores usam o estado persistido retornado pela API e atualizam a cada 3 segundos. Não são métricas de vendas, faturamento ou estoque.

## EXT02 — Acompanhamento por QR code

A confirmação apresenta QR code e link para `/#/pedido/:id`. O UUID do pedido permite consultar somente número da senha, estado, criação, conclusão e quantidade de senhas à frente. Os itens do pedido e dados de usuários não aparecem nesse endpoint público.

O QR code é gerado no próprio navegador pela biblioteca `qrcode`. O endereço usa a origem pela qual o sistema foi aberto; o acesso por celular exige uma origem acessível entre dispositivos. O link é de consulta e não permite chamar ou concluir pedidos. A consulta atualiza a cada 3 segundos e mostra falhas de conexão.

O identificador deve ser compartilhado somente com quem acompanha a senha. Conhecer um número sequencial de senha não permite derivar o UUID do link.
