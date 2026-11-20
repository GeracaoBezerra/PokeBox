const ouvintes = new Set();

export function ouvirSessaoExpirada(ouvinte) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function avisarSessaoExpirada() {
  ouvintes.forEach((ouvinte) => ouvinte());
}
