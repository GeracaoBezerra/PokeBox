import cors from 'cors';
import express, { type Express } from 'express';
import swaggerUi from 'swagger-ui-express';

import type { Container } from './container.js';
import { swaggerSpec } from './docs/swagger.js';
import { notFoundHandler } from './middlewares/errorHandler.js';

export function createApp(container: Container): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    return res.status(200).json({ success: true, data: { status: 'ok' } });
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
