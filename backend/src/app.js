import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  return res.status(200).json({ success: true, data: { status: 'ok' } });
});

app.use('/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
