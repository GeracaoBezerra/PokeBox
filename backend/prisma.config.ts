
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: "../.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },

  datasource: {
    url: process.env["PRISMA_DATABASE_URL"],
  },
});
