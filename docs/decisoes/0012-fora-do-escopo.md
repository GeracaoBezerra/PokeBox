# 0012. O que o time decidiu não fazer

| Item | Motivo |
|---|---|
| Venda, preço e pagamento | Plataforma só de trocas ([0002](0002-so-trocas.md)) |
| Ambiente de homologação | Dobraria contas e segredos ([0008](0008-deploy.md)) |
| Plano pago para a API não dormir | Monitor de uptime resolve ([0008](0008-deploy.md)) |
| Refresh token, troca e recuperação de senha | Fora das regras da aula; refresh token é dívida técnica ([0011](0011-autenticacao.md)) |
| Chat entre colecionadores | A negociação acontece pela oferta; chat fica como ideia futura |
| Upload de imagem das cartas | A TCGdex já traz as imagens; melhoria futura é tratar melhor as cartas sem imagem (hoje há uma imagem de reserva) |
| Notificação em tempo real | O selo de pendências no header atualiza ao navegar; WebSocket fica para depois |
| Prazo para confirmar a troca | Não faz parte das regras; registrado como limitação |
| Leilão de cartas | Ideia para o futuro (#234) |
| Circuit breaker na TCGdex | Novas tentativas e o catálogo local já cobrem o caso comum |
