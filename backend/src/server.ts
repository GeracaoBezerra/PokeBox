import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { buildContainer } from './container.js';

const env = loadEnv();
const container = buildContainer(env);
const app = createApp(container);

const PORT = env.BACKEND_PORT ?? env.PORT;

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Swagger em http://localhost:${PORT}/docs`);
});

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} recebido, encerrando o servidor`);

  server.close();
  try {
    await container.shutdown();
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
