import { useId } from "react";

import styles from "./BlocoDados.module.css";

// Um grupo de campos com título (ex.: "Informações pessoais").
// Fora da edição mostra "rótulo → valor"; na edição, um input por campo.
export default function BlocoDados({
  titulo,
  campos,
  valores,
  editando,
  onAlterar,
  focarPrimeiro = false, // põe o foco no 1º campo ao entrar na edição
}) {
  const id = useId();

  return (
    <section className={styles.bloco} aria-labelledby={`${id}-titulo`}>
      <h3 id={`${id}-titulo`} className={styles.titulo}>
        {titulo}
      </h3>

      {editando ? (
        <div className={styles.formulario}>
          {campos.map((campo, indice) => {
            const idCampo = `${id}-${campo.chave}`;
            const propsEntrada = {
              id: idCampo,
              className: styles.entrada,
              value: valores[campo.chave] ?? "",
              readOnly: campo.somenteLeitura,
              autoFocus: focarPrimeiro && indice === 0,
              onChange: (evento) => onAlterar(campo.chave, evento.target.value),
            };

            return (
              <div
                key={campo.chave}
                className={
                  campo.tipo === "textarea" ? styles.campoLargo : styles.campo
                }
              >
                <label htmlFor={idCampo} className={styles.rotulo}>
                  {campo.rotulo}
                </label>

                {campo.tipo === "textarea" ? (
                  <textarea rows={3} {...propsEntrada} />
                ) : (
                  <input type={campo.tipo ?? "text"} required={campo.obrigatorio} {...propsEntrada} />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <dl className={styles.lista}>
          {campos.map((campo) => {
            const valor = valores[campo.chave];

            return (
              <div key={campo.chave} className={styles.linha}>
                <dt>{campo.rotulo}</dt>
                <dd>
                  {valor || <span className={styles.vazio}>Não informado</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
