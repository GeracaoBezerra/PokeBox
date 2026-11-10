import { useState } from "react";

import MenuPerfil from "../MenuPerfil/MenuPerfil";
import SecaoEditavel from "../SecaoEditavel/SecaoEditavel";
import HistoricoTrocas from "../HistoricoTrocas/HistoricoTrocas";
import {
  informacoesExemplo,
  trocasExemplo,
} from "../../mocks/perfilExemplo";
import styles from "./Perfil.module.css";

// Opções do painel da esquerda, na ordem em que aparecem.
const SECOES = [
  { id: "informacoes", rotulo: "Minhas informações" },
  { id: "trocas", rotulo: "Minhas trocas" },
];

const BLOCOS_INFORMACOES = [
  {
    titulo: "Informações pessoais",
    campos: [
      { chave: "nome", rotulo: "Nome" },
      { chave: "email", rotulo: "Email", tipo: "email" },
      { chave: "celular", rotulo: "Celular", tipo: "tel" },
    ],
  },
];

export default function Perfil() {
  const [secaoAtiva, setSecaoAtiva] = useState("informacoes");

  // TODO: trocar pelo usuário logado vindo da API; salvar vira PATCH /user/me
  
  const [informacoes, setInformacoes] = useState(informacoesExemplo);

  return (
    <div className={styles.secao}>
      <div className={styles.container}>
        <MenuPerfil
          secoes={SECOES}
          selecionada={secaoAtiva}
          onSelecionar={setSecaoAtiva}
        />

        <div className={styles.conteudo}>

          {secaoAtiva === "trocas" && <HistoricoTrocas trocas={trocasExemplo} />}

          {secaoAtiva === "informacoes" && (
            <SecaoEditavel
              titulo="Minhas informações"
              blocos={BLOCOS_INFORMACOES}
              valores={informacoes}
              onSalvar={setInformacoes}
            />
          )}
        </div>
      </div>
    </div>
  );
}
