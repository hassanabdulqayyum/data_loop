export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  transform: {
    // Any .js, .ts, .jsx or .tsx file will be passed through babel-jest with the
    // same preset we already use in the production build (React automatic
    // runtime). The inline option here means we **do not** need a separate
    // `babel.config.js` lookup during test runs which slightly speeds up Jest.
    '^.+\\.[jt]sx?$': ['babel-jest', {
      presets: [['@babel/preset-react', { runtime: 'automatic' }]]
    }]
  },
  transformIgnorePatterns: ['node_modules/(?!(react|react-dom)/)'],
  moduleNameMapper: {
    // Stub CSS imports to empty objects so Jest doesn't choke.
    '^.+\\.(css|less|scss)$': 'identity-obj-proxy'
  },
  extensionsToTreatAsEsm: ['.jsx'],
}; 