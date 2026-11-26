# 0012. O que o time decidiu não fazer

| Item | Motivo |
|---|---|
| Venda, preço e pagamento | Plataforma só de trocas ([decisão sobre só trocas](0002-so-trocas.md)) |
| Ambiente de homologação | Dobraria contas e segredos ([decisão sobre deploy](0008-deploy.md)) |
| Plano pago para a API não dormir | Monitor de uptime resolve ([decisão sobre deploy](0008-deploy.md)) |
| Refresh token, verificação de e-mail, troca e recuperação de senha | Fora das regras da aula e pedem um serviço de envio de e-mail. São dívidas técnicas: verificação de e-mail ([#252](https://github.com/GeracaoBezerra/PokeBox/issues/252)), recuperação de senha ([#253](https://github.com/GeracaoBezerra/PokeBox/issues/253)) e refresh token ([decisão sobre autenticação](0011-autenticacao.md)) |
| Chat entre colecionadores | A negociação acontece pela oferta. O chat entra na ideia de um marketplace no estilo da OLX, sugerida pelo professor na apresentação ([#255](https://github.com/GeracaoBezerra/PokeBox/issues/255)) |
| Upload de imagem das cartas | A TCGdex já traz as imagens; melhoria futura é tratar melhor as cartas sem imagem (hoje há uma imagem de reserva) |
| Notificação em tempo real | O selo de pendências no header atualiza ao navegar; WebSocket fica para depois |
| Prazo para confirmar a troca | Não faz parte das regras; registrado como limitação |
| Leilão de cartas | Ideia para o futuro (#234) |
| Circuit breaker na TCGdex | Novas tentativas e o catálogo local já cobrem o caso comum |
