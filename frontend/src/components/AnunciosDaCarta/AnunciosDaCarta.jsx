import { Link } from "react-router-dom";
import s from "../../styles/paginas.module.css";
import { CONDICOES, variante } from "../../utils/rotulos";

export default function AnunciosDaCarta({ listings }) {
  return (
    <div className={s.secao}>
      <h2>Anúncios ativos desta carta</h2>
      {listings.length === 0 ? (
        <p className={s.suave}>Ninguém está anunciando esta carta agora.</p>
      ) : (
        <div className={s.tabelaWrap}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Colecionador</th>
                <th>Variante</th>
                <th>Condição</th>
                <th>Quantidade</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {listings.map((anuncio) => (
                <tr key={anuncio.id}>
                  <td>
                    <Link className={s.link} to={`/u/${anuncio.owner.username}`}>
                      @{anuncio.owner.username}
                    </Link>
                  </td>
                  <td>{variante(anuncio.item)}</td>
                  <td>{CONDICOES[anuncio.item.condition]}</td>
                  <td>{anuncio.quantity}</td>
                  <td>
                    <Link className={s.link} to={`/marketplace/${anuncio.id}`}>
                      Ver anúncio
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
