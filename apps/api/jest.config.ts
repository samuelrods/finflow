import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: [
    'modules/**/*.{ts,js}',
    // Exclude files that have nothing to test independently
    '!**/*.module.ts',
    '!**/dto/**',
    '!**/*.guard.ts',
    '!**/*.strategy.ts',
    '!**/*.decorator.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    // Enforces a minimum — CI will fail if coverage drops below these.
    // Services (where business logic lives) should be near 100%.
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};

export default config;
