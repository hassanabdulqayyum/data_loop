export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest'
  },
  moduleNameMapper: {
    // Stub CSS imports to empty objects so Jest doesn't choke.
    '^.+\\.(css|less|scss)$': 'identity-obj-proxy'
  }
}; 