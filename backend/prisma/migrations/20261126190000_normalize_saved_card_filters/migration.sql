-- Normaliza apenas o snapshot Card usado pela coleção, wishlist e marketplace.
WITH aliases(localized, canonical) AS (
  VALUES
  ('Colorless', 'Colorless'), ('Incolor', 'Colorless'), ('Incolora', 'Colorless'), ('Incolore', 'Colorless'), ('Farblos', 'Colorless'),
  ('Darkness', 'Darkness'), ('Sombrio', 'Darkness'), ('Oscura', 'Darkness'), ('Obscurité', 'Darkness'), ('Unlicht', 'Darkness'), ('Oscurità', 'Darkness'),
  ('Dragon', 'Dragon'), ('Dragão', 'Dragon'), ('Dragón', 'Dragon'), ('Drache', 'Dragon'), ('Drago', 'Dragon'),
  ('Fairy', 'Fairy'), ('Fada', 'Fairy'), ('Hada', 'Fairy'), ('Fée', 'Fairy'), ('Fee', 'Fairy'), ('Folletto', 'Fairy'),
  ('Fighting', 'Fighting'), ('Lutador', 'Fighting'), ('Lucha', 'Fighting'), ('Combat', 'Fighting'), ('Kampf', 'Fighting'), ('Lotta', 'Fighting'),
  ('Fire', 'Fire'), ('Fogo', 'Fire'), ('Fuego', 'Fire'), ('Feu', 'Fire'), ('Feuer', 'Fire'), ('Fuoco', 'Fire'),
  ('Grass', 'Grass'), ('Planta', 'Grass'), ('Plante', 'Grass'), ('Pflanze', 'Grass'), ('Erba', 'Grass'),
  ('Lightning', 'Lightning'), ('Elétrico', 'Lightning'), ('Rayo', 'Lightning'), ('Électrique', 'Lightning'), ('Elektro', 'Lightning'), ('Lampo', 'Lightning'),
  ('Metal', 'Metal'), ('Metálica', 'Metal'), ('Métal', 'Metal'), ('Metall', 'Metal'), ('Metallo', 'Metal'),
  ('Psychic', 'Psychic'), ('Psíquico', 'Psychic'), ('Psy', 'Psychic'), ('Psycho', 'Psychic'), ('Psico', 'Psychic'),
  ('Water', 'Water'), ('Água', 'Water'), ('Agua', 'Water'), ('Eau', 'Water'), ('Wasser', 'Water'), ('Acqua', 'Water')
),
normalized AS (
  SELECT card.id, ARRAY(
    SELECT COALESCE(aliases.canonical, btrim(raw.value))
    FROM unnest(card.types) WITH ORDINALITY AS raw(value, position)
    LEFT JOIN aliases ON lower(aliases.localized) = lower(btrim(raw.value))
    GROUP BY COALESCE(aliases.canonical, btrim(raw.value))
    ORDER BY min(raw.position)
  ) AS types
  FROM "Card" AS card
)
UPDATE "Card" AS card
SET types = normalized.types, rarity = NULLIF(btrim(card.rarity), '')
FROM normalized
WHERE card.id = normalized.id
  AND (card.types IS DISTINCT FROM normalized.types
    OR card.rarity IS DISTINCT FROM NULLIF(btrim(card.rarity), ''));
