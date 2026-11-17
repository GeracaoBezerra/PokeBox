// Distribuição estável: parece aleatória, mas não muda ao atualizar a coleção.
function variacao(indice, semente) {
  const valor = Math.sin((indice + 1) * 127.1 + semente * 311.7) * 43758.5453;
  return valor - Math.floor(valor);
}

const ICONES = {
  grass: {
    contorno: "M6 27C2 20 4 11 12 7C18 4 24 5 29 2C28 10 29 18 23 24C18 30 11 30 6 27Z",
    nervuras: "M4 30L25 7M10 24L9 16M15 19L14 11M19 15L24 15M13 21L21 22",
  },
  fire: {
    contorno: "M17 1C19 10 29 13 28 23C27 31 20 34 13 32C4 30 1 23 5 15C6 20 9 21 10 17C10 10 16 8 17 1Z",
    nervuras: "M15 28C10 24 15 20 17 17C17 22 23 25 19 29",
  },
  water: {
    contorno: "M16 1C13 7 3 16 3 23C3 30 9 33 16 33C23 33 29 30 29 23C29 16 19 7 16 1Z",
    nervuras: "M8 22C8 27 11 29 15 29M19 9L22 14",
  },
  lightning: {
    contorno: "M18 1L4 20H13L10 33L29 12H19L24 1Z",
    nervuras: "M17 8L12 16H20L17 22",
  },
  psychic: {
    contorno: "M1 17C8 4 24 4 31 17C24 30 8 30 1 17Z",
    nervuras: "M22 17A6 6 0 1 1 10 17A6 6 0 1 1 22 17M16 14V20",
  },
  fighting: {
    contorno: "M6 29L3 17L5 11L9 12V5L14 3L18 5L23 4L27 7L28 19L24 26L23 32H9Z",
    nervuras: "M10 12L18 14L20 19L13 21L8 17M14 6V11M19 7V12M24 9V15",
  },
  darkness: {
    contorno: "M23 2C7 -2 -2 15 6 27C12 36 27 34 31 23C18 28 9 14 23 2Z",
    nervuras: "M8 19C9 25 14 28 19 28",
  },
  dragon: {
    contorno: "M3 5L13 8L21 1L20 10L28 13L31 20L26 24L22 21L18 23L23 31L11 33L4 27L8 18L5 13Z",
    nervuras: "M19 15L23 16M10 13L13 18L9 25L15 29M24 20L28 20",
  },
  fairy: {
    contorno: "M16 1L21 12L31 17L21 22L16 33L11 22L1 17L11 12Z",
    nervuras: "M16 10L19 17L16 24L13 17Z",
  },
  metal: {
    contorno: "M16 1L30 9V25L16 33L2 25V9ZM16 11L11 14V20L16 23L21 20V14Z",
    nervuras: "M16 5L26 11M26 23L16 29M6 22V12",
  },
  colorless: {
    contorno: "M16 1L20 11L30 7L25 17L31 26L20 25L16 33L12 25L1 26L7 17L2 7L12 11Z",
    nervuras: "M16 10V23M10 13L22 20M22 13L10 20",
  },
};

const ALIASES = {
  grama: "grass", planta: "grass", fogo: "fire", agua: "water",
  eletrico: "lightning", electric: "lightning", psiquico: "psychic",
  lutador: "fighting", luta: "fighting", sombrio: "darkness", dark: "darkness",
  dragao: "dragon", fada: "fairy", aco: "metal", incolor: "colorless",
};

function normalizar(tipo) {
  const chave = String(tipo).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return ALIASES[chave] ?? chave;
}

const POSICOES = Array.from({ length: 60 }, (_, indice) => ({
  estilo: {
    left: `${((indice % 6) + 0.1 + variacao(indice, 1) * 0.8) * (100 / 6)}%`,
    top: `${(Math.floor(indice / 6) + 0.1 + variacao(indice, 2) * 0.8) * 10}%`,
    "--icone-escala": 0.7 + variacao(indice, 3) * 0.6,
    "--icone-rotacao": `${variacao(indice, 4) * 360}deg`,
    opacity: 0.18 + variacao(indice, 5) * 0.2,
  },
}));

export default function DecoracaoTipos({ tipos = [], className }) {
  const conhecidos = [...new Set(tipos.map(normalizar))].filter((tipo) => Object.hasOwn(ICONES, tipo));
  if (!conhecidos.length) return null;

  // Distribuição equilibrada, depois embaralhada para misturar os símbolos.
  // Quando 60 não divide exatamente, a diferença entre tipos é de apenas 1.
  const distribuicao = POSICOES.map((_, indice) => conhecidos[indice % conhecidos.length]);
  for (let indice = distribuicao.length - 1; indice > 0; indice--) {
    const destino = Math.floor(variacao(indice, 6) * (indice + 1));
    [distribuicao[indice], distribuicao[destino]] = [distribuicao[destino], distribuicao[indice]];
  }

  return (
    <div className={className} aria-hidden="true">
      {POSICOES.map(({ estilo }, indice) => (
        <svg key={indice} data-tipo-icone={distribuicao[indice]} viewBox="0 0 32 34" style={estilo} focusable="false">
          <path d={ICONES[distribuicao[indice]].contorno} fill="currentColor" fillRule="evenodd" />
          <path d={ICONES[distribuicao[indice]].nervuras} fill="none" stroke="var(--superficie-funda)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}
