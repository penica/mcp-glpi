module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  passWithNoTests: true,
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};
