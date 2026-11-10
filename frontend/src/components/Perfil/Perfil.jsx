import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { adminCheck, deactivateMe, getMe, updateMe } from "../../api/auth";
import { listMyTrades } from "../../api/trades";
import { useAuthService } from "../../auth/useAuthService";
import { useAcao } from "../../hooks/useAcao";
import { useCarregar } from "../../hooks/useCarregar";
import Aviso from "../Aviso/Aviso";
import MenuPerfil from "../MenuPerfil/MenuPerfil";
import PainelPerfil from "../PainelPerfil/PainelPerfil";
import SecaoEditavel from "../SecaoEditavel/SecaoEditavel";
import HistoricoTrocas from "../HistoricoTrocas/HistoricoTrocas";
import styles from "./Perfil.module.css";

const SECOES = [
  { id: "perfil", rotulo: "Meu perfil" },
  { id: "trocas", rotulo: "Minhas trocas" },
  { id: "informacoes", rotulo: "Minhas informações" },
  { id: "conta", rotulo: "Conta" },
];

const BLOCOS_PERFIL = [
  {
    titulo: "Perfil público",
    campos: [
      { chave: "username", rotulo: "Usuário", somenteLeitura: true },
      { chave: "name", rotulo: "Nome", obrigatorio: true },
    ],
  },
];

const BLOCOS_INFORMACOES = [
  {
    titulo: "Informações pessoais",
    campos: [
      { chave: "email", rotulo: "Email", tipo: "email", somenteLeitura: true },
      { chave: "phone", rotulo: "Celular (DDD + número, só dígitos)", tipo: "tel" },
    ],
  },
  {
    titulo: "Informações de entrega",
    campos: [
      { chave: "cep", rotulo: "CEP (8 dígitos)" },
      { chave: "street", rotulo: "Rua" },
      { chave: "number", rotulo: "Número" },
      { chave: "complement", rotulo: "Complemento" },
      { chave: "neighborhood", rotulo: "Bairro" },
      { chave: "city", rotulo: "Cidade" },
      { chave: "state", rotulo: "Estado (sigla)" },
    ],
  },
];

const EDITAVEIS = ["name", "phone", "cep", "street", "number", "complement", "neighborhood", "city", "state"];

const STATUS_TROCA = { PROPOSED: "pendente", ACCEPTED: "concluida", REJECTED: "recusada", CANCELED: "cancelada" };

function paraCartaTroca(item) {
  return {
    id: item.card.id,
    nome: item.card.name,
    set: item.card.setName,
    numero: item.card.number,
    src: item.card.imageUrl,
    quantidade: item.quantity,
  };
}

function paraTroca(troca, username) {
  const souQuemOfertou = troca.proposer.username === username;
  const parceiro = souQuemOfertou ? troca.recipient : troca.proposer;
  return {
    id: troca.id,
    status: STATUS_TROCA[troca.status],
    parceiro: parceiro.username,
    propostaPor: souQuemOfertou ? "voce" : "parceiro",
    propostaEm: troca.createdAt,
    respondidaEm: troca.completedAt,
    ofereceu: troca.items.filter((item) => item.from === username).map(paraCartaTroca),
    recebeu: troca.items.filter((item) => item.to === username).map(paraCartaTroca),
  };
}

async function carregarPerfil() {
  const [user, trocas] = await Promise.all([getMe(), listMyTrades()]);
  const todas = [...trocas.sent, ...trocas.received]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((troca) => paraTroca(troca, user.username));
  return { user, trocas: todas };
}

function SecaoConta({ user }) {
  const authService = useAuthService();
  const navigate = useNavigate();
  const acao = useAcao();

  async function testarAdmin() {
    await acao.executar(adminCheck, "Acesso de ADMIN confirmado pela API.");
  }

  async function desativar() {
    if (!window.confirm("Desativar a conta? Você será desconectado e não conseguirá entrar de novo.")) return;
    const { ok } = await acao.executar(deactivateMe);
    if (ok) {
      authService.logout();
      navigate("/");
    }
  }

  return (
    <PainelPerfil titulo="Conta">
      <p>
        Papel: <strong>{user.role}</strong> · status: <strong>{user.accountStatus}</strong>
      </p>
      <div className={styles.acoesConta}>
        {user.role === "ADMIN" && (
          <button type="button" className={styles.botaoConta} onClick={testarAdmin} disabled={acao.ocupado}>
            Testar acesso de ADMIN
          </button>
        )}
        <button type="button" className={styles.botaoPerigo} onClick={desativar} disabled={acao.ocupado}>
          Desativar minha conta
        </button>
      </div>
      <Aviso erro={acao.erro} sucesso={acao.sucesso} />
    </PainelPerfil>
  );
}

export default function Perfil() {
  const [secaoAtiva, setSecaoAtiva] = useState("perfil");
  const { dados, erro, recarregar } = useCarregar(carregarPerfil);
  const salvar = useAcao();

  async function onSalvar(valores) {
    const mudancas = {};
    for (const chave of EDITAVEIS) {
      const novo = (valores[chave] ?? "").trim();
      const atual = dados.user[chave] ?? "";
      if (novo !== atual) mudancas[chave] = novo === "" ? null : novo;
    }
    if (Object.keys(mudancas).length === 0) return true;
    const { ok } = await salvar.executar(() => updateMe(mudancas), "Dados salvos.");
    if (ok) recarregar();
    return ok;
  }

  if (erro) return <Aviso erro={erro} />;
  if (!dados) return null;

  return (
    <div className={styles.secao}>
      <div className={styles.container}>
        <MenuPerfil secoes={SECOES} selecionada={secaoAtiva} onSelecionar={setSecaoAtiva} />

        <div className={styles.conteudo}>
          <Aviso erro={salvar.erro} sucesso={salvar.sucesso} />

          {secaoAtiva === "perfil" && (
            <SecaoEditavel titulo="Meu perfil" blocos={BLOCOS_PERFIL} valores={dados.user} onSalvar={onSalvar} />
          )}

          {secaoAtiva === "trocas" && <HistoricoTrocas trocas={dados.trocas} />}

          {secaoAtiva === "informacoes" && (
            <SecaoEditavel
              titulo="Minhas informações"
              blocos={BLOCOS_INFORMACOES}
              valores={dados.user}
              onSalvar={onSalvar}
            />
          )}

          {secaoAtiva === "conta" && <SecaoConta user={dados.user} />}
        </div>
      </div>
    </div>
  );
}
