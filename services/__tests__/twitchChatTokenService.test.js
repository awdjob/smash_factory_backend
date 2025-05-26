const axios = require('axios');
const tokenService = require('../twitchChatTokenService');
const RefreshToken = require('../../models/refreshToken');
// const { withConsole } = require('../../testHelpers');
const { dbConnect, dbDisconnect } = require('../../mongoTestConfig');

jest.mock('axios');

describe('TwitchChatTokenService', () => {
    const mockAccessToken = 'mock_access_token';
    const mockRefreshToken = 'mock_refresh_token';
    const mockExpiresIn = 3600; // 1 hour in seconds

    let ogEnv = process.env;

    beforeEach(async () => {
        process.env = {
            ...ogEnv,
            TWITCH_CLIENT_ID: 'mock_client_id',
            TWITCH_CLIENT_SECRET: 'mock_client_secret',
            TWITCH_REDIRECT_URI: 'mock_redirect_uri'
        };

        await dbConnect();

        tokenService.initialize();
    });

    afterEach(async () => {
        await dbDisconnect();
        jest.resetAllMocks();
    });

    describe('initialize', () => {
        it('should reset all state variables', async () => {
            // Set some initial state
            tokenService.accessToken = 'old_token';
            tokenService.tokenExpiry = Date.now() + 1000;
            tokenService.refreshPromise = Promise.resolve();
            tokenService.retryCount = 5;

            await tokenService.initialize();

            expect(tokenService.accessToken).toBeNull();
            expect(tokenService.tokenExpiry).toBeNull();
            expect(tokenService.refreshPromise).toBeNull();
            expect(tokenService.retryCount).toBe(0);
        });

        it('should clear existing refresh timeout', async () => {
            // Set up a mock timeout
            const mockTimeout = setTimeout(() => { }, 1000);
            tokenService.refreshTimeout = mockTimeout;

            // Spy on clearTimeout
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            await tokenService.initialize();

            expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeout);
            clearTimeoutSpy.mockRestore();
        });
    });

    describe('handleOAuthCallback', () => {
        let mockReq, mockRes;
        beforeEach(() => {
            // Mock successful token response for initial auth
            mockReq = {
                query: {
                    code: 'mock_auth_code'
                }
            };
            mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };
            axios.post.mockResolvedValueOnce({
                data: {
                    access_token: mockAccessToken,
                    refresh_token: mockRefreshToken,
                    expires_in: mockExpiresIn
                }
            });
        });

    it('should handle successful OAuth flow and schedule refresh timeout', async () => {
        const ogScheduleRefresh = tokenService._scheduleNextRefresh;
        tokenService._scheduleNextRefresh = jest.fn();

        // Mock successful user verification
        axios.get.mockResolvedValueOnce({
            data: {
                data: [{
                    login: 'smashfactorybot'
                }]
            }
        });

        await tokenService.handleOAuthCallback(mockReq, mockRes);

        // Verify initial OAuth request
        expect(axios.post).toHaveBeenCalledWith(
            'https://id.twitch.tv/oauth2/token',
            null,
            expect.objectContaining({
                params: expect.objectContaining({
                    client_id: process.env.TWITCH_CLIENT_ID,
                    code: 'mock_auth_code',
                    grant_type: 'authorization_code'
                })
            })
        );

        expect(tokenService.accessToken).toBe(mockAccessToken);
        expect(tokenService.tokenExpiry).toBeGreaterThan(Date.now());
        expect(mockRes.send).toHaveBeenCalledWith('Bot authorized successfully');

        expect(tokenService._scheduleNextRefresh).toHaveBeenCalledWith(mockExpiresIn);

        // Verify timeout is stored
        expect(tokenService.refreshTimeout).toBeDefined();

        tokenService._scheduleNextRefresh = ogScheduleRefresh;
    });

    it('should reject unauthorized bot accounts', async () => {
        axios.get.mockResolvedValueOnce({
            data: {
                data: [{
                    login: 'differentbot'  // This should trigger the 403
                }]
            }
        });

        await tokenService.handleOAuthCallback(mockReq, mockRes);

        // Verify the user verification request was made
        expect(axios.get).toHaveBeenCalledWith(
            'https://api.twitch.tv/helix/users',
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': `Bearer ${mockAccessToken}`
                })
            })
        );

        // Verify the error response
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.send).toHaveBeenCalledWith(
            'Unauthorized: Only smashfactorybot can be used for this application'
        );
    });

    it('should handle missing authorization code', async () => {
        const reqWithoutCode = { query: {} };
        await tokenService.handleOAuthCallback(reqWithoutCode, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.send).toHaveBeenCalledWith('Authorization code missing');
    });

    it('should handle Twitch API errors', async () => {
        const errorMessage = 'Invalid authorization code';
        axios.post.mockRejectedValueOnce({
            response: {
                status: 400,
                data: { message: errorMessage }
            }
        });

        await tokenService.handleOAuthCallback(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.send).toHaveBeenCalledWith('Error obtaining Twitch token');
    });
});

describe('_scheduleNextRefresh', () => {
    beforeEach(() => {
        // Mock successful token response for refresh
        axios.post.mockResolvedValue({
            data: {
                access_token: 'new_access_token',
                refresh_token: 'new_refresh_token',
                expires_in: mockExpiresIn
            }
        });
    });

    it('should assign _nextRefreshCallback to refreshTimeout', () => {
        jest.useFakeTimers();
        const ogNextRefreshCallback = tokenService._nextRefreshCallback;
        tokenService._nextRefreshCallback = jest.fn();

        tokenService.accessToken = mockAccessToken;
        tokenService.tokenExpiry = Date.now() + (mockExpiresIn * 1000);

        tokenService._scheduleNextRefresh(mockExpiresIn);

        expect(tokenService.refreshTimeout).toBeDefined();
        jest.advanceTimersByTime(mockExpiresIn * 1000);

        // ensure that the callback that was called is the _nextRefreshCallback
        expect(tokenService._nextRefreshCallback).toHaveBeenCalled();

        tokenService._nextRefreshCallback = ogNextRefreshCallback;
        jest.useRealTimers();
    });
});

describe('refreshAccessToken', () => {
    it('should throw an error if there is no RefreshToken stored', async () => {
        try {
            tokenService.refreshAccessToken();
        } catch (e) {
            expect(e.message).toBe('No refresh token available');
        }
    });

    it('should set the access token on the service and update the refresh token in the database and schedule the next refresh', async () => {
        const ogScheduleNextRefresh = tokenService._scheduleNextRefresh;
        tokenService._scheduleNextRefresh = jest.fn();

        await RefreshToken.updateRefreshToken("mock_refresh_token");

        axios.post.mockResolvedValueOnce({
            data: {
                access_token: 'new_access_token',
                refresh_token: 'new_refresh_token',
                expires_in: mockExpiresIn
            }
        });

        await tokenService.refreshAccessToken();

        expect(tokenService.accessToken).toBe('new_access_token');
        expect(tokenService.tokenExpiry).toBeGreaterThan(Date.now());
        const refreshToken = await RefreshToken.getRefreshToken();
        expect(refreshToken).toBe('new_refresh_token');
        expect(tokenService._scheduleNextRefresh).toHaveBeenCalledWith(mockExpiresIn);

        tokenService._scheduleNextRefresh = ogScheduleNextRefresh;
    })
});

describe('getValidAccessToken', () => {
    it('should refresh token when expired and schedule next refresh', async () => {
        tokenService.tokenExpiry = Date.now() - 1000; // Expired token
        tokenService.accessToken = 'old_token';
        const originalRefreshAccessToken = tokenService.refreshAccessToken;
        tokenService.refreshAccessToken = jest.fn().mockImplementation(() => {
            tokenService.accessToken = 'new_token';
            tokenService.tokenExpiry = Date.now() + (mockExpiresIn * 1000);
            return Promise.resolve();
        });

        const token = await tokenService.getValidAccessToken();
        expect(token).toBe('new_token');

        tokenService.refreshAccessToken = originalRefreshAccessToken;
    });

    it('should fetch and set accessToken if it is not set', async () => {
        await RefreshToken.updateRefreshToken("mock_refresh_token");
        tokenService.accessToken = null;

        tokenService.refreshAccessToken = jest.fn().mockImplementation(() => {
            tokenService.accessToken = 'new_token';
            tokenService.tokenExpiry = Date.now() + (mockExpiresIn * 1000);
            return Promise.resolve();
        });

        const token = await tokenService.getValidAccessToken();
        expect(token).toBe('new_token');
    });
});
}); 