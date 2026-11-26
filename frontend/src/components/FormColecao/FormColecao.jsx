import { useId, useState } from "react";
import { addToCollection } from "../../api/collection";
import { errosPorCampo } from "../../api/mensagens";
import { useAcao } from "../../hooks/useAcao";
import { useToast } from "../../hooks/useToast";
import s from "../../styles/detalheCarta.module.css";
import { CONDICOES, variante } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import ErroCampo from "../ErroCampo/ErroCampo";

const ACABAMENTO_DA_VARIANTE = { normal: "NORMAL", holo: "HOLO", reverse: "REVERSE" };

function acabamentosDisponiveis(variants = {}) {
  const lista = Object.entries(ACABAMENTO_DA_VARIANTE)
    .filter(([chave]) => variants[chave])
    .map(([, finish]) => finish);
  return lista.length ? lista : ["NORMAL", "HOLO", "REVERSE"];
}

const MENSAGEM_PADRAO = () => "Carta adicionada à coleção.";

export default function FormColecao({ card, lang, onAdicionado, mensagem = MENSAGEM_PADRAO }) {
  const variantes = card.variants ?? {};
  const acabamentos = acabamentosDisponiveis(variantes);
  const podeMarcarPrimeiraEdicao = variantes.firstEdition || !Object.values(variantes).some(Boolean);
  const [form, setForm] = useState({
    finish: acabamentos[0],
    firstEdition: false,
    condition: "NEAR_MINT",
    quantity: 1,
    isPublic: true,
  });
  const { erro, ocupado, executar } = useAcao();
  const toast = useToast();
  const idErroQuantidade = useId();
  const erroQuantidade = errosPorCampo(erro?.details).quantity;

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (ocupado) return;
    const quantidade = Number(form.quantity);
    const { ok, resultado } = await executar(() => addToCollection({ cardId: card.id, ...form, quantity: quantidade, lang }));
    if (!ok) return;
    toast.sucesso(mensagem(resultado, quantidade));
    onAdicionado(resultado);
  }

  return (
    <form className={s.formulario} onSubmit={enviar}>
      <p className={s.suave}>Escolha a versão e o estado da carta que você tem.</p>
      <div className={s.campos}>
        {acabamentos.length > 1 ? (
          <label className={s.campo}>
            Acabamento
            <select value={form.finish} onChange={(e) => alterar("finish", e.target.value)}>
              {acabamentos.map((finish) => (
                <option key={finish} value={finish}>
                  {variante({ finish, firstEdition: false })}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className={s.campo}>
            Acabamento
            <span className={s.valorFixo}>{variante({ finish: acabamentos[0], firstEdition: false })}</span>
          </div>
        )}
        <label className={s.campo}>
          Condição
          <select value={form.condition} onChange={(e) => alterar("condition", e.target.value)}>
            {Object.entries(CONDICOES).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <div className={s.quantidadeAdicao}>
          <label className={s.campo}>
            Quantidade
            <input
              type="number"
              min="1"
              required
              value={form.quantity}
              aria-invalid={Boolean(erroQuantidade)}
              aria-describedby={erroQuantidade ? idErroQuantidade : undefined}
              onChange={(e) => alterar("quantity", e.target.value)}
            />
          </label>
          <ErroCampo id={idErroQuantidade} mensagem={erroQuantidade} />
        </div>
        <div className={s.opcoesAdicao}>
          <label className={s.checkbox}>
            <input type="checkbox" checked={form.isPublic} onChange={(e) => alterar("isPublic", e.target.checked)} />
            Visível no meu perfil público
          </label>
          {podeMarcarPrimeiraEdicao && (
            <label className={s.checkbox}>
              <input type="checkbox" checked={form.firstEdition} onChange={(e) => alterar("firstEdition", e.target.checked)} />
              1ª edição
            </label>
          )}
        </div>
      </div>
      <button className={s.botao} type="submit" disabled={ocupado}>
        {ocupado ? "Adicionando…" : "Adicionar à coleção"}
      </button>
      <Aviso erro={erro} campos={["quantity"]} />
    </form>
  );
}
