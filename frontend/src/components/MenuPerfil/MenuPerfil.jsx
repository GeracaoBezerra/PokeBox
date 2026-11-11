import styles from "./MenuPerfil.module.css";

// Painel da esquerda: funciona como seletor. Quem escolhe a seção
// (e mostra o painel da direita) é a página, este componente só avisa.
export default function MenuPerfil({ secoes, selecionada, onSelecionar }) {
  return (
    <div className={styles.menu}>
      <h1 className={styles.titulo}>Meu Perfil</h1>

      <nav aria-label="Seções do perfil">
        <ul className={styles.lista} role="list">
          {secoes.map((secao) => (
            <li key={secao.id} className={styles.item}>
              <button
                type="button"
                className={styles.opcao}
                aria-current={secao.id === selecionada ? "true" : undefined}
                onClick={() => onSelecionar(secao.id)}
              >
                {secao.rotulo}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
