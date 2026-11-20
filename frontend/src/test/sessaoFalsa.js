export function criarSessaoFalsa(user = { name: "Ash Ketchum", username: "ash" }) {
  let sessao = user ? { user } : null;
  const ouvintes = new Set();
  const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());
  return {
    getSession: () => sessao,
    subscribe: (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    entrar: (novoUser) => {
      sessao = { user: novoUser };
      avisar();
    },
    logout: () => {
      sessao = null;
      avisar();
    },
  };
}
