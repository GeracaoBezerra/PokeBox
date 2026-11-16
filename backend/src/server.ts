import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { buildContainer } from './container.js';
import { shutdownTracing } from './instrumentation.js';

const env = loadEnv();
const container = buildContainer(env);
const app = createApp(container);

const { logger } = container.infra;
const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, docs: `http://localhost:${PORT}/docs` }, `servidor no ar em http://localhost:${PORT}`);
});

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'encerrando o servidor');

  server.close();
  try {
    await container.shutdown();
    await shutdownTracing();
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
