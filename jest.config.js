module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    'config/**/*.js',
    '!config/environments/**',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  // config/environments/test.js es CONFIGURACIÓN de entorno, no una suite: con
  // el testMatch anterior jest lo tomaba como test y fallaba con "Your test
  // suite must contain at least one test".
  testPathIgnorePatterns: [
    '/node_modules/',
    '/config/environments/'
  ],
  verbose: true,
  testTimeout: 10000
};
