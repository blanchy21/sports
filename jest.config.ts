const config = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '@hiveio/workerbee$': '<rootDir>/node_modules/@hiveio/workerbee/dist/bundle/index.js',
    '@hiveio/wax$': '<rootDir>/node_modules/@hiveio/wax/wasm/dist/bundle/node.js'
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
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
