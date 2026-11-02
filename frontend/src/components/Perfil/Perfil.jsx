import { useState } from "react";

import MenuPerfil from "../MenuPerfil/MenuPerfil";
import SecaoEditavel from "../SecaoEditavel/SecaoEditavel";
import HistoricoTrocas from "../HistoricoTrocas/HistoricoTrocas";
import {
  perfilExemplo,
  informacoesExemplo,
  trocasExemplo,
} from "../../mocks/perfilExemplo";
import styles from "./Perfil.module.css";

// Opções do painel da esquerda, na ordem em que aparecem.
const SECOES = [
  { id: "perfil", rotulo: "Meu perfil" },
  { id: "trocas", rotulo: "Minhas trocas" },
  { id: "informacoes", rotulo: "Minhas informações" },
];

// Campos de cada seção editável, agrupados em blocos.
// tipo: "text" (padrão) | "email" | "tel" | "textarea"
// somenteLeitura: aparece na edição, mas não pode ser alterado.
const BLOCOS_PERFIL = [
  {
    titulo: "Perfil público",
    campos: [
      { chave: "usuario", rotulo: "Usuário" },
      { chave: "nomeExibicao", rotulo: "Nome de exibição" },
      { chave: "bio", rotulo: "Bio", tipo: "textarea" },
    ],
  },
];

const BLOCOS_INFORMACOES = [
  {
    titulo: "Informações pessoais",
    campos: [
      { chave: "nome", rotulo: "Nome" },
      { chave: "cpf", rotulo: "CPF", somenteLeitura: true },
      { chave: "email", rotulo: "Email", tipo: "email" },
      { chave: "celular", rotulo: "Celular", tipo: "tel" },
    ],
  },
  {
    titulo: "Informações de entrega",
    campos: [
      { chave: "endereco", rotulo: "Endereço" },
      { chave: "bairro", rotulo: "Bairro" },
      { chave: "cidade", rotulo: "Cidade" },
      { chave: "cep", rotulo: "CEP" },
    ],
  },
];

export default function Perfil() {
  const [secaoAtiva, setSecaoAtiva] = useState("perfil");

  // TODO: trocar pelo usuário logado vindo da API; salvar vira PATCH /user/me
  const [perfil, setPerfil] = useState(perfilExemplo);
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
          {secaoAtiva === "perfil" && (
            <SecaoEditavel
              titulo="Meu perfil"
              blocos={BLOCOS_PERFIL}
              valores={perfil}
              onSalvar={setPerfil}
            />
          )}

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
