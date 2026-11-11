import { useId } from "react";

import styles from "./PainelPerfil.module.css";

// Moldura do painel da direita: título, ações de edição e o conteúdo.
// Sem onEditar, o painel é só leitura (ex.: histórico de trocas).
// O botão Salvar é type="submit", então um painel editável precisa estar
// dentro de um <form> (veja o SecaoEditavel).
export default function PainelPerfil({
  titulo,
  editando = false,
  onEditar,
  onCancelar,
  children,
}) {
  const idTitulo = useId();

  return (
    <section className={styles.painel} aria-labelledby={idTitulo}>
      <header className={styles.cabecalho}>
        <h2 id={idTitulo} className={styles.titulo}>
          {titulo}
        </h2>

        {onEditar && (
          <div className={styles.acoes}>
            {editando ? (
              <>
                <button
                  type="button"
                  className={styles.cancelar}
                  onClick={onCancelar}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.salvar}>
                  Salvar
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.editar}
                aria-label={`Editar ${titulo.toLowerCase()}`}
                onClick={onEditar}
              >
                Editar
              </button>
            )}
          </div>
        )}
      </header>

      {children}
    </section>
  );
}
