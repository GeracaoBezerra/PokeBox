import cors from 'cors';
import express, { type Express } from 'express';
import swaggerUi from 'swagger-ui-express';

import { buildCorsOptions } from './config/cors.js';
import type { Container } from './container.js';
import { swaggerSpec } from './docs/swagger.js';
import { notFoundHandler } from './middlewares/errorHandler.js';

export function createApp(container: Container): Express {
  const app = express();
  const { env, prisma } = container.infra;
  const version = env.RENDER_GIT_COMMIT ?? 'local';

  app.use(container.requestLogger);
  app.use(cors(buildCorsOptions(env)));
  app.use(express.json());

  app.get('/health', (req, res) => {
    return res.status(200).json({ success: true, data: { status: 'ok', version } });
  });

  app.get('/health/ready', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.status(200).json({ success: true, data: { status: 'ok', database: 'ok', version } });
    } catch (err) {
      req.log.error({ err }, 'banco indisponível');
      return res.status(503).json({ success: false, error: 'Banco de dados indisponível' });
    }
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { swaggerOptions: { persistAuthorization: true } }));

  for (const module of container.modules) {
    for (const { path, router } of module.routes) {
      app.use(path, router);
    }
  }

  app.use(notFoundHandler);
  app.use(container.errorHandler);

  return app;
}
