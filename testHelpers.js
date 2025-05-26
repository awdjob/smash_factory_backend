/**
 * Test helper utilities for Jest tests
 */

const { dbConnect, dbDisconnect } = require('./mongoTestConfig');

// Store original console methods
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
};

// Store spies for cleanup
let activeSpies = [];

// Default options for all tests
const defaultOptions = {
    silentConsole: true,
    useFakeTimers: true,
    spyTimers: true  // Whether to spy on timer functions
};

// Store cleanup function for the current test
let currentCleanup = null;

// Setup MongoDB before all tests
beforeEach(async () => {
    currentCleanup = setupTest();
});

// Cleanup MongoDB after all tests
afterEach(async () => {
    if (currentCleanup) {
        currentCleanup();
        currentCleanup = null;
    }
});

/**
 * Setup test environment with optional console mocking and timer spying
 * @param {Object} options - Setup options
 * @param {boolean} [options.silentConsole=true] - Whether to mock console methods
 * @param {boolean} [options.useFakeTimers=true] - Whether to use Jest's fake timers
 * @param {boolean} [options.spyTimers=true] - Whether to spy on timer functions
 */
const setupTest = (options = {}) => {
    const {
        silentConsole = defaultOptions.silentConsole,
        useFakeTimers = defaultOptions.useFakeTimers,
        spyTimers = defaultOptions.spyTimers
    } = options;

    // Mock console methods if silentConsole is true
    if (silentConsole) {
        console.log = jest.fn();
        console.error = jest.fn();
        console.warn = jest.fn();
        console.info = jest.fn();
        console.debug = jest.fn();
    }

    // Setup fake timers if requested
    if (useFakeTimers) {
        jest.useFakeTimers();
    }

    // Setup timer spies if requested
    if (spyTimers) {
        const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
        activeSpies.push(setTimeoutSpy, clearTimeoutSpy);
    }

    // Return cleanup function
    return () => {
        // Restore console methods
        if (silentConsole) {
            console.log = originalConsole.log;
            console.error = originalConsole.error;
            console.warn = originalConsole.warn;
            console.info = originalConsole.info;
            console.debug = originalConsole.debug;
        }

        // Restore timers
        if (useFakeTimers) {
            jest.useRealTimers();
        }

        // Restore and clear all spies
        activeSpies.forEach(spy => spy.mockRestore());
        activeSpies = [];

        // Clear all mocks and timers
        jest.clearAllMocks();
        jest.clearAllTimers();
    };
};

/**
 * Temporarily restore console methods for a specific test
 * @param {string[]} methods - Array of console methods to restore (e.g., ['log', 'error'])
 */
const withConsole = (methods = ['log', 'error']) => {
    const originalMethods = {};
    
    // Store and restore original methods
    methods.forEach(method => {
        if (originalConsole[method]) {
            originalMethods[method] = console[method];
            console[method] = originalConsole[method];
        }
    });

    // Return cleanup function
    return () => {
        methods.forEach(method => {
            if (originalMethods[method]) {
                console[method] = originalMethods[method];
            }
        });
    };
};

/**
 * Configure default test options for all tests
 * @param {Object} options - Default options to use for all tests
 */
const configureTestDefaults = (options) => {
    Object.assign(defaultOptions, options);
};

// Export everything needed
module.exports = {
    setupTest,
    withConsole,
    originalConsole,
    configureTestDefaults
}; 