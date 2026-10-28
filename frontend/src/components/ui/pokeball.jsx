const TYPES = {
  poke: "#e63946",
  great: "#3a86ff",
  ultra: "#ffb703",
  master: "#8338ec",
};

export default function Pokeball({ type = "poke", size = 36 }) {
  const top = TYPES[type] ?? TYPES.poke;
  const band = "#222";

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#fff" stroke={band} strokeWidth="6" />
      <path d="M4 50a46 46 0 0 1 92 0z" fill={top} stroke={band} strokeWidth="6" />
      <rect x="4" y="46" width="92" height="8" fill={band} />
      <circle cx="50" cy="50" r="13" fill="#fff" stroke={band} strokeWidth="6" />
      <circle cx="50" cy="50" r="5" fill="#ddd" />
    </svg>
  );
}