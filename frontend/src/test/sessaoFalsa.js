export function criarSessaoFalsa(user = { name: "Ash Ketchum", username: "ash" }) {
  let sessao = user ? { user } : null;
  let saidaVoluntaria = false;
  const ouvintes = new Set();
  const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());
  return {
    getSession: () => sessao,
    saiuPorVontade: () => saidaVoluntaria,
    subscribe: (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    entrar: (novoUser) => {
      sessao = { user: novoUser };
      saidaVoluntaria = false;
      avisar();
    },
    logout: ({ voluntaria = false } = {}) => {
      saidaVoluntaria = voluntaria;
      sessao = null;
      avisar();
    },
  };
}
