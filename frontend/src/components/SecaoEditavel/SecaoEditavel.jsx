import { useState } from "react";

import BlocoDados from "../BlocoDados/BlocoDados";
import PainelPerfil from "../PainelPerfil/PainelPerfil";

// Seção do painel da direita que pode ser editada (Meu perfil e
// Minhas informações). Mostra os dados; ao clicar em Editar, os campos
// viram inputs. Salvar entrega os valores novos para onSalvar(valores);
// Cancelar descarta o que foi digitado.
export default function SecaoEditavel({ titulo, blocos, valores, onSalvar, erros, onAlterar, onCancelar, children }) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(valores);

  function editar() {
    setRascunho(valores); // sempre começa do que está salvo
    setEditando(true);
  }

  function cancelar() {
    setEditando(false);
    onCancelar?.();
  }

  async function salvar(evento) {
    evento.preventDefault();
    const ok = await onSalvar(rascunho);
    if (ok !== false) setEditando(false);
  }

  function alterar(chave, valor) {
    setRascunho((atual) => ({ ...atual, [chave]: valor }));
    onAlterar?.(chave, valor);
  }

  return (
    <form onSubmit={salvar}>
      <PainelPerfil
        titulo={titulo}
        editando={editando}
        onEditar={editar}
        onCancelar={cancelar}
      >
        {blocos.map((bloco, indice) => (
          <BlocoDados
            key={bloco.titulo}
            titulo={bloco.titulo}
            campos={bloco.campos}
            valores={editando ? rascunho : valores}
            editando={editando}
            onAlterar={alterar}
            erros={editando ? erros : undefined}
            focarPrimeiro={indice === 0}
          />
        ))}
        {children}
      </PainelPerfil>
    </form>
  );
}
