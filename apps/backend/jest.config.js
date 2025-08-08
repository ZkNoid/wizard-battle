module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'js'],
    transform: { '^.+\\.ts$': 'ts-jest' },
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  };