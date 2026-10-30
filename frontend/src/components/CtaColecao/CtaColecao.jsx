import styles from "./CtaColecao.module.css";
import { Link } from "react-router-dom";
import blastoise from "../../assets/cards/blastoise.webp"
import charizard from "../../assets/cards/charizard.webp"
import venusaur from "../../assets/cards/venasaur.webp"

const cartas = [
  {
    id: 1,
    src: blastoise,
    rot: "-12deg",
    x: "-62%",
    z: 1,
  },
  {
    id: 2,
    src: charizard,
    rot: "0deg",
    x: "0%",
    z: 2,
  },
  {
    id: 3,
    src: venusaur,
    rot: "12deg",
    x: "62%",
    z: 1,
  },
];

// Segue a jornada principal do documento da aula:
// coleção → disponibilizar → proposta/troca
const passos = [
  {
    titulo: "Cadastre",
    texto: "Adicione à sua coleção as cartas que você já tem.",
  },
  {
    titulo: "Marque",
    texto: "Escolha quais ficam disponíveis para troca e quais você procura.",
  },
  {
    titulo: "Troque",
    texto: "Envie propostas e negocie com outros colecionadores.",
  },
];

// Desenho de fundo: raios saindo do centro (alternando longos e curtos)
// e pequenos brilhos. Coordenadas no viewBox -100..100 do SVG.
const RAIOS = Array.from({ length: 24 }, (_, i) => {
  const angulo = (i / 24) * Math.PI * 2;
  const fim = i % 2 === 0 ? 98 : 78;

  return {
    x1: Math.cos(angulo) * 56,
    y1: Math.sin(angulo) * 56,
    x2: Math.cos(angulo) * fim,
    y2: Math.sin(angulo) * fim,
  };
});

const BRILHOS = [
  { x: -72, y: -40, s: 1.1 },
  { x: 68, y: -52, s: 1.5 },
  { x: 80, y: 24, s: 0.8 },
  { x: -84, y: 30, s: 1 },
  { x: 10, y: -88, s: 0.9 },
  { x: -30, y: 84, s: 0.7 },
];

// Faz o brilho do foil seguir o mouse (as variáveis são lidas no CSS).
function handlePointerMove(event) {
  if (event.pointerType !== "mouse") return;

  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;

  el.style.setProperty("--ponteiro-x", `${x}%`);
  el.style.setProperty("--ponteiro-y", `${y}%`);
  el.style.setProperty("--holo-x", `${x}%`);
  el.style.setProperty("--holo-y", `${y}%`);
  el.style.setProperty("--glare", "1");
}

function handlePointerLeave(event) {
  const el = event.currentTarget;

  el.style.setProperty("--ponteiro-x", "50%");
  el.style.setProperty("--ponteiro-y", "50%");
  el.style.setProperty("--holo-x", "50%");
  el.style.setProperty("--holo-y", "50%");
  el.style.setProperty("--glare", "0");
}

export default function CtaColecao() {
  return (
    <section
      className={styles.ctaSection}
      aria-labelledby="cta-colecao-titulo"
    >
      <div className={styles.ctaContainer}>
        <div className={styles.ctaText}>
          <span className={styles.ctaEyebrow}>Para colecionadores</span>

          <h2 id="cta-colecao-titulo" className={styles.ctaTitle}>
            Monte sua <span className={styles.ctaDestaque}>coleção</span>
          </h2>

          <p className={styles.ctaDescription}>
            Cadastre as cartas que você já tem, marque as que quer trocar e
            encontre outros colecionadores para negociar.
          </p>

          <ol className={styles.passos}>
            {passos.map((passo, index) => (
              <li key={passo.titulo} className={styles.passo}>
                <span className={styles.passoNumero} aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <strong className={styles.passoTitulo}>{passo.titulo}</strong>
                  <span className={styles.passoTexto}>{passo.texto}</span>
                </div>
              </li>
            ))}
          </ol>

          {/* TODO: trocar por "/collection" quando a rota existir */}
          <Link to="/" className={styles.ctaButton}>
            Começar minha coleção
          </Link>
        </div>

        {/* Decorativo: some para leitores de tela */}
        <div className={styles.palco} aria-hidden="true">
          <svg
            className={styles.explosao}
            viewBox="-100 -100 200 200"
            focusable="false"
          >
            <defs>
              <radialGradient id="cta-brilho">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle r="90" fill="url(#cta-brilho)" />
            <circle
              r="62"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.14"
              strokeWidth="0.6"
            />

            <g
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.2"
              strokeOpacity="0.22"
            >
              {RAIOS.map((raio, index) => (
                <line
                  key={index}
                  x1={raio.x1}
                  y1={raio.y1}
                  x2={raio.x2}
                  y2={raio.y2}
                />
              ))}
            </g>

            <g fill="currentColor" fillOpacity="0.4">
              {BRILHOS.map((brilho, index) => (
                <path
                  key={index}
                  transform={`translate(${brilho.x} ${brilho.y}) scale(${brilho.s})`}
                  d="M0 -4 Q0.6 -0.6 4 0 Q0.6 0.6 0 4 Q-0.6 0.6 -4 0 Q-0.6 -0.6 0 -4Z"
                />
              ))}
            </g>
          </svg>

          <div className={styles.leque}>
            {cartas.map((carta) => (
              <div
                key={carta.id}
                className={styles.posicao}
                style={{ "--rot": carta.rot, "--x": carta.x, "--z": carta.z }}
              >
                <div className={styles.flutuador}>
                  <div
                    className={styles.carta}
                    data-raridade-nivel="3"
                    onPointerMove={handlePointerMove}
                    onPointerLeave={handlePointerLeave}
                  >
                    <img
                      className={styles.imagem}
                      src={carta.src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}