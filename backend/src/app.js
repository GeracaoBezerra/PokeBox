import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/auth.routes.js';
import cardRoutes from './routes/cardRoutes.js';
import { swaggerSpec } from './docs/swagger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  return res.status(200).json({ success: true, data: { status: 'ok' } });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/auth', authRoutes);
app.use('/cards', cardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
