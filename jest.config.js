module.exports = {
    // Automatically include our test helper in all test files
    // setupFilesAfterEnv: ['./testHelpers.js'],
    
    // Other Jest configuration options
    testEnvironment: 'node',
    // verbose: true,
    moduleNameMapper: {
        '^@root/(.*)$': '<rootDir>/$1',
        '^@models/(.*)$': '<rootDir>/models/$1',
        '^@controllers/(.*)$': '<rootDir>/controllers/$1',
        '^@services/(.*)$': '<rootDir>/services/$1',
        '^@utils/(.*)$': '<rootDir>/utils/$1',
        '^@middlewares/(.*)$': '<rootDir>/middlewares/$1'
    }
};