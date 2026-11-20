import { textoVoceDa, textoVoceRecebe } from "../../utils/oferta";
import s from "./ResumoTroca.module.css";

export default function ResumoTroca({ anuncio, quantidade, escolhidas, aviso }) {
  return (
    <div className={s.resumo} aria-live="polite">
      <h3 className={s.titulo}>Resumo da troca</h3>
      <p>{textoVoceRecebe(anuncio, quantidade)}</p>
      <p>{textoVoceDa(escolhidas)}</p>
      {aviso && <p className={s.aviso} role="alert">{aviso}</p>}
    </div>
  );
}
