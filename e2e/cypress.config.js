import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "cypress";
import dotenv from "dotenv";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

const LIMPAR_DADOS = `TRUNCATE "TradeItem", "Trade", "OfferItem", "Offer", "Listing", "WishlistItem", "CollectionItem", "User" RESTART IDENTITY CASCADE;`;

function compose(comando, opcoes = {}) {
  execSync(`docker compose ${comando}`, { cwd: RAIZ, stdio: "inherit", ...opcoes });
}

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    video: Boolean(process.env.CI),
    retries: { runMode: 1, openMode: 0 },
    expose: { apiUrl: "http://localhost:3000" },
    setupNodeEvents(on, config) {
      dotenv.config({ path: `${RAIZ}.env`, quiet: true });
      config.env.senhaAdmin = process.env.SEED_ADMIN_PASSWORD;
      config.env.senhaDemo = process.env.SEED_DEMO_PASSWORD;

      on("task", {
        resetarBanco() {
          compose(`exec -T tcg-db sh -c 'psql -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'`, {
            input: LIMPAR_DADOS,
            stdio: ["pipe", "inherit", "inherit"],
          });
          compose("exec -T tcg-backend npx prisma db seed");
          return null;
        },
      });

      return config;
    },
  },
});
