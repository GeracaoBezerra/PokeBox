import { useEffect, useRef, useState } from "react";

// S: só cuida do fundo. Leve por padrão: celular / economia de dados / reduced-motion => só o poster.
function canPlayVideo(minWidth) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = navigator.connection?.saveData;
  return !reduce && !saveData && innerWidth >= minWidth;
}

export default function BackgroundVideo({ minWidth = 769 }) {
  const ref = useRef(null);
  const [enabled] = useState(() => canPlayVideo(minWidth));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (enabled) ref.current?.play().catch(() => setReady(false));
  }, [enabled]);

  return (
    <div className="bg" aria-hidden="true">
      {enabled && (
        <video
          ref={ref} muted loop playsInline preload="metadata" poster="/assets/fundo.webp"
          className={ready ? "on" : ""} onCanPlay={() => setReady(true)}
        >
          <source src="/assets/fundo.webm" type="video/webm" />
          <source src="/assets/fundo.mp4" type="video/mp4" />
        </video>
      )}
      <div className="shade" />
    </div>
  );
}
