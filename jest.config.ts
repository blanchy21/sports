const config = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@jest/(.*)$': '<rootDir>/node_modules/@jest/$1',
    '@hiveio/workerbee$': '<rootDir>/node_modules/@hiveio/workerbee/dist/bundle/index.js',
    '@hiveio/wax$': '<rootDir>/node_modules/@hiveio/wax/wasm/dist/bundle/node.js'
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testSequencer: '<rootDir>/node_modules/@jest/test-sequencer/build/index.js',
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.jest.json'
      }
    ]
  },
  transformIgnorePatterns: ['/node_modules/(?!(@aioha|@hiveio/workerbee|@hiveio/wax)/)']
};

export default config;
