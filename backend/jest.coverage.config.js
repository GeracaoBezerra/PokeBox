import base from './jest.config.js';
import integration from './jest.integration.config.js';

export default {
  projects: [
    { ...base, displayName: 'unit' },
    { ...integration, displayName: 'integration' },
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/generated/**',
    '!src/docs/**',
    '!src/mocks/**',
    '!src/types/**',
    '!src/server.ts',
  ],
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: { statements: 94, branches: 86, functions: 95, lines: 95 },
  },
};
