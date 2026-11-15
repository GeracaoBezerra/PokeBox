import base from './jest.config.js';

export default {
  ...base,
  testMatch: ['<rootDir>/test/integration/**/*.int.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  setupFiles: ['<rootDir>/test/integration/support/setupEnv.ts'],
  globalSetup: '<rootDir>/test/integration/support/globalSetup.ts',
  testTimeout: 20000,
};
