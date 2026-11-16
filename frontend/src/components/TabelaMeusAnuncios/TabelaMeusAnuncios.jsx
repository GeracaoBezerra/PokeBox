import s from "../../styles/paginas.module.css";
import LinhaMeuAnuncio from "../LinhaMeuAnuncio/LinhaMeuAnuncio";

export default function TabelaMeusAnuncios({ anuncios, onMudou }) {
  return (
    <div className={s.tabelaWrap}>
      <table className={s.tabela}>
        <thead>
          <tr>
            <th />
            <th>Carta</th>
            <th>Status</th>
            <th>Quantidade</th>
            <th>Descrição</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {anuncios.map((anuncio) => (
            <LinhaMeuAnuncio key={anuncio.id} anuncio={anuncio} onMudou={onMudou} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
