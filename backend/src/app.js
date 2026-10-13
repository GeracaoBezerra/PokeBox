import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import cardRoutes from './routes/cardRoutes.js';
import { swaggerSpec } from './docs/swagger.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('minha api está funcionando.');
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/cards', cardRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

export default app;
