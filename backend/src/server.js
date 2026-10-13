import './config/env.js';
import app from './app.js';

const PORT = process.env.BACKEND_PORT ?? process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Swagger em http://localhost:${PORT}/docs`);
});

export default app;
