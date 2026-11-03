
import styles from "./footer.module.css";

const informacoes = [
  { label: "Sobre PokeBox", href: "/sobre" },
  { label: "Segurança", href: "/seguranca" },
  { label: "Trabalhe Conosco", href: "/trabalhe-conosco" },
  { label: "Wishlist", href: "/wishlist"},
];

const categorias = [
  { label: "Cartas Raras", href: "/cartas?categoria=raras" },
  {
    label: "Cartas de Treinadores",
    href: "/cartas?categoria=treinadores",
  },
  { label: "Cartas Foil", href: "/cartas?categoria=foil" },
];

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle className={styles.iconDot} cx="17.5" cy="6.8" r="1" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0 0-5ZM3 10h4v11H3zM9 10h3.8v1.5h.1a4.2 4.2 0 0 1 3.8-2.1c4.1 0 4.9 2.5 4.9 5.8V21h-4v-5.2c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9V21H9z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .9a11.1 11.1 0 0 0-3.5 21.6c.6.1.8-.3.8-.6v-2.1c-3.1.7-3.8-1.3-3.8-1.3-.5-1.2-1.2-1.5-1.2-1.5-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 1.7 2.5 1.2 3.2.9.1-.7.4-1.2.7-1.5-2.5-.3-5.1-1.2-5.1-5.5 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.4.1-2.9 0 0 .9-.3 3.1 1.1a10.8 10.8 0 0 1 5.6 0c2.1-1.4 3-1.1 3-1.1.6 1.5.2 2.6.1 2.9.7.8 1.1 1.8 1.1 3 0 4.3-2.6 5.2-5.1 5.5.4.3.7 1 .7 1.9v2.8c0 .3.2.7.8.6A11.1 11.1 0 0 0 12 .9Z" />
    </svg>
  );
}

function SocialLink({ href, label, children }) {
  return (
    <a
      className={styles.socialLink}
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

function FooterLinks({ title, links }) {
  return (
    <nav className={styles.column} aria-label={title}>
      <h2 className={styles.columnTitle}>{title}</h2>

      <ul className={styles.linkList}>
        {links.map(({ label, href, destaque }) => (
          <li key={label}>
            <a
              className={`${styles.footerLink} ${
                destaque ? styles.highlightLink : ""
              }`}
              href={href}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <section className={styles.brandColumn} aria-label="Sobre a PokeBox">
          <a className={styles.logo} href="/" aria-label="PokeBox — página inicial">
            <span>Poke</span>
            <span className={styles.logoAccent}>Box</span>
          </a>

          <p className={styles.description}>
            Conectando colecionadores de Pokémon TCG.
            <br />
            Gerencie, troque e descubra novas cartas
            <br className={styles.desktopBreak} />
            {" "}em uma comunidade global e segura.
          </p>

          <div className={styles.socialLinks}>
            {/* Substitua pelos endereços reais dos seus perfis. */}
            <SocialLink
              href="https://instagram.com/"
              label="Instagram da PokeBox"
            >
              <InstagramIcon />
            </SocialLink>

            <SocialLink
              href="https://linkedin.com/"
              label="LinkedIn da PokeBox"
            >
              <LinkedInIcon />
            </SocialLink>

            <SocialLink
              href="https://github.com/"
              label="GitHub da PokeBox"
            >
              <GithubIcon />
            </SocialLink>
          </div>
        </section>

        <FooterLinks title="Informação" links={informacoes} />

        <FooterLinks title="Categorias" links={categorias} />

        <section className={styles.column}>
          <h2 className={styles.columnTitle}>Contato</h2>

          <address className={styles.contactInfo}>
            <p>
              Rua dos Treinadores, 1500
              <br />
              Bairro Pokémon, CEP 12345-678
              <br />
              Cidade Kanto - SP
            </p>

            <p className={styles.phone}>
              <strong>Tel:</strong>{" "}
              <a href="tel:+551140028922">+55 (11) 4002-8922</a>
            </p>
          </address>
        </section>
      </div>

      <div className={styles.footerBottom}>
        <p>
          © 2026 PokeBox. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}