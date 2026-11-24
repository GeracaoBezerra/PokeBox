# 0002. Plataforma só de trocas

Data: 05/11/2026 · Issue #51 (decisão D-08)

## Contexto

A RN-05 do enunciado previa anúncios de venda, de troca ou dos dois. Venda traz preço, pagamento, frete e disputa, nada disso pedido pelas regras da aula.

## Decisão

O PokeBox é só de trocas. Saíram o preço e o tipo do anúncio. A oferta passou a listar as cartas da coleção que a pessoa dá em troca (`OfferItem`).

## Alternativa descartada

Manter venda e troca juntas, como no enunciado. Exigiria fluxo de pagamento ou deixaria o preço sem uso real.

## Consequências

- A RN-05 virou "só anuncia o que tem disponível para troca". O desvio está explicado no [README](../../README.md#adaptação-só-trocas).
- O preço da TCGdex continua visível, só como referência para comparar o que se dá e o que se recebe.
