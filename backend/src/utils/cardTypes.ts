const aliasesByType = {
  Colorless: ['Incolor', 'Incolora', 'Incolore', 'Farblos'],
  Darkness: ['Sombrio', 'Oscura', 'Obscurité', 'Unlicht', 'Oscurità'],
  Dragon: ['Dragão', 'Dragón', 'Drache', 'Drago'],
  Fairy: ['Fada', 'Hada', 'Fée', 'Fee', 'Folletto'],
  Fighting: ['Lutador', 'Lucha', 'Combat', 'Kampf', 'Lotta'],
  Fire: ['Fogo', 'Fuego', 'Feu', 'Feuer', 'Fuoco'],
  Grass: ['Planta', 'Plante', 'Pflanze', 'Erba'],
  Lightning: ['Elétrico', 'Rayo', 'Électrique', 'Elektro', 'Lampo'],
  Metal: ['Metálica', 'Métal', 'Metall', 'Metallo'],
  Psychic: ['Psíquico', 'Psy', 'Psycho', 'Psico'],
  Water: ['Água', 'Agua', 'Eau', 'Wasser', 'Acqua'],
} as const;

const canonicalTypes = new Map(
  Object.entries(aliasesByType).flatMap(([type, aliases]) =>
    [type, ...aliases].map((value) => [value.toLowerCase(), type] as const),
  ),
);

export function normalizeCardTypes(types: readonly string[]): string[] {
  return [...new Set(types.map((type) => canonicalTypes.get(type.trim().toLowerCase()) ?? type.trim()))];
}
