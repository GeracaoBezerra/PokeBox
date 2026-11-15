import { assertTestDatabase, loadTestEnv } from './globalSetup.js';

loadTestEnv();
assertTestDatabase(process.env.DATABASE_URL);
