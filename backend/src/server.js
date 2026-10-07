import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const app = (await import('./app.js')).default;

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
