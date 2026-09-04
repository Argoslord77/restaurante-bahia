module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  // config/environments/test.js es una archivo de configuración del entorno
  // de pruebas, NO una suite: si Jest lo recoge falla con "must contain at
  // least one test".
  testPathIgnorePatterns: [
    '/node_modules/',
    '/config/environments/'
  ],
  verbose: true,
  testTimeout: 10000
};
