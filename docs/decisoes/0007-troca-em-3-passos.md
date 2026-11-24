# 0007. Troca em 3 passos: aceitar cria a troca e os dois confirmam

Data: 20/11/2026 · Issues #213 e #217 · PR #216

## Contexto

O fluxo antigo tinha 4 passos: o dono aceitava a oferta, mas a troca só nascia quando quem ofertou clicava em "Criar troca", sem aviso de que era a vez dele. Cancelar não devolvia nada ao anúncio.

## Decisão

1. O dono aceita a oferta e a troca nasce na mesma transação, com as cartas dos dois lados reservadas (RN-08).
2. Cada parte confirma quando recebe as cartas.
3. Na segunda confirmação, as cartas mudam de dono de uma vez (RN-07).

Complementos:

- O anúncio perde só a quantidade da troca e, se zerar, fica "Em troca".
- As outras ofertas do anúncio ficam em espera e voltam a valer se a troca cair.
- A oferta guarda uma cópia das cartas oferecidas (#217).
- Conta com troca aberta não pode ser desativada.

## Alternativas descartadas

Manter o passo "Criar troca", deixar cancelar oferta já aceita e somar as ofertas aceitas na coleção. Todas deixavam estados confusos para quem usa ou exigiam mais regras.

## Consequências

- Testes de conservação garantem que nenhuma carta some ou duplica (`tradeConservation` e `tradeRollback`).
- Não há prazo para confirmar: uma troca pode ficar aberta segurando as cartas.
