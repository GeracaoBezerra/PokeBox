import { Component } from "react";
import s from "./ErroDeTela.module.css";

export default class ErroDeTela extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className={s.area} role="alert">
        <h1 className={s.titulo}>Não foi possível abrir esta tela</h1>
        <p className={s.texto}>O site pode ter sido atualizado enquanto você navegava. Recarregue a página para continuar.</p>
        <button type="button" className={s.botao} onClick={() => window.location.reload()}>
          Recarregar a página
        </button>
      </div>
    );
  }
}
