import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { adminCheck, deactivateMe, getMe, updateMe } from "../../api/auth";
import { listMyTrades } from "../../api/trades";
import { useAuthService } from "../../auth/useAuthService";
import { useAcao } from "../../hooks/useAcao";
import { useCarregar } from "../../hooks/useCarregar";
import { mascararCep, mascararTelefone } from "../../utils/mascaras";
import { UFS, montarMudancas, validarPerfil } from "../../utils/perfil";
import Aviso from "../Aviso/Aviso";
import ConfirmModal from "../ConfirmModal/ConfirmModal";
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
      { chave: "phone", rotulo: "Celular", tipo: "tel", mascara: mascararTelefone },
    ],
  },
  {
    titulo: "Informações de entrega",
    campos: [
      { chave: "cep", rotulo: "CEP", inputMode: "numeric", mascara: mascararCep },
      { chave: "street", rotulo: "Rua" },
      { chave: "number", rotulo: "Número" },
      { chave: "complement", rotulo: "Complemento" },
      { chave: "neighborhood", rotulo: "Bairro" },
      { chave: "city", rotulo: "Cidade" },
      { chave: "state", rotulo: "Estado", tipo: "select", opcoes: UFS },
    ],
  },
];

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
  const [confirmando, setConfirmando] = useState(false);
  const [digitado, setDigitado] = useState("");

  async function testarAdmin() {
    await acao.executar(adminCheck, "Acesso de ADMIN confirmado pela API.");
  }

  function fechar() {
    setConfirmando(false);
    setDigitado("");
  }

  async function desativar() {
    const { ok } = await acao.executar(deactivateMe);
    if (ok) {
      authService.logout();
      navigate("/");
    } else {
      fechar();
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
        <button type="button" className={styles.botaoPerigo} onClick={() => setConfirmando(true)} disabled={acao.ocupado}>
          Desativar minha conta
        </button>
      </div>
      <Aviso erro={acao.erro} />
      <ConfirmModal
        aberto={confirmando}
        titulo="Desativar sua conta?"
        mensagem="Você não vai conseguir entrar de novo, e seu perfil público some."
        textoConfirmar="Desativar conta"
        perigo
        ocupado={acao.ocupado}
        confirmarDesativado={digitado !== user.username}
        onConfirmar={desativar}
        onCancelar={fechar}
      >
        <label className={styles.confirmarUsuario}>
          <span>
            Para confirmar, digite <strong>{user.username}</strong>
          </span>
          <input value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" spellCheck={false} />
        </label>
      </ConfirmModal>
    </PainelPerfil>
  );
}

export default function Perfil() {
  const [secaoAtiva, setSecaoAtiva] = useState("perfil");
  const { dados, erro, recarregar } = useCarregar(carregarPerfil);
  const salvar = useAcao();
  const [erros, setErros] = useState({});

  function limparErro(chave) {
    setErros((atuais) => {
      if (!atuais[chave]) return atuais;
      const restantes = { ...atuais };
      delete restantes[chave];
      return restantes;
    });
  }

  async function onSalvar(valores) {
    const encontrados = validarPerfil(valores);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return false;
    const mudancas = montarMudancas(valores, dados.user);
    if (Object.keys(mudancas).length === 0) return true;
    const { ok } = await salvar.executar(() => updateMe(mudancas), "Dados salvos.");
    if (ok) recarregar();
    return ok;
  }

  if (erro) return <Aviso erro={erro} onTentarDeNovo={recarregar} />;
  if (!dados) return null;

  return (
    <div className={styles.secao}>
      <div className={styles.container}>
        <MenuPerfil secoes={SECOES} selecionada={secaoAtiva} onSelecionar={setSecaoAtiva} />

        <div className={styles.conteudo}>
          <Aviso erro={salvar.erro} />

          {secaoAtiva === "perfil" && (
            <SecaoEditavel
              titulo="Meu perfil"
              blocos={BLOCOS_PERFIL}
              valores={dados.user}
              onSalvar={onSalvar}
              erros={erros}
              onAlterar={limparErro}
              onCancelar={() => setErros({})}
            >
              <div className={styles.perfilPublico}>
                {dados.user.role === "ADMIN" && <span className={styles.selo}>Administrador</span>}
                <Link className={styles.link} to={`/u/${dados.user.username}`}>
                  Ver como os outros me veem
                </Link>
              </div>
            </SecaoEditavel>
          )}

          {secaoAtiva === "trocas" && <HistoricoTrocas trocas={dados.trocas} />}

          {secaoAtiva === "informacoes" && (
            <SecaoEditavel
              titulo="Minhas informações"
              blocos={BLOCOS_INFORMACOES}
              valores={dados.user}
              onSalvar={onSalvar}
              erros={erros}
              onAlterar={limparErro}
              onCancelar={() => setErros({})}
            />
          )}

          {secaoAtiva === "conta" && <SecaoConta user={dados.user} />}
        </div>
      </div>
    </div>
  );
}
