// Import the singleton instance
const twitchStreamerService = require('../twitchStreamerService');

const originalEnv = process.env;

describe('TwitchStreamerService', () => {
    beforeAll(() => {
        process.env.TWITCH_CLIENT_ID = 'test-client-id';
        process.env.TWITCH_CLIENT_SECRET = 'test-client-secret';
        process.env.TWITCH_SIGNUP_REDIRECT_URI = 'http://localhost:3000/auth/callback';
        process.env.TWITCH_WEBHOOK_URL = 'http://localhost:3000/webhook';
        process.env.TWITCH_WEBHOOK_SECRET = 'test-webhook-secret';
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    describe('getUserInfo', () => {
        const mockAccessToken = 'test-access-token';
        const mockUserData = {
            id: '123456789',
            login: 'testuser',
            display_name: 'TestUser',
            type: '',
            broadcaster_type: 'partner',
            description: 'Test channel description',
            profile_image_url: 'https://example.com/profile.jpg',
            offline_image_url: 'https://example.com/offline.jpg',
            view_count: 1000,
            created_at: '2020-01-01T00:00:00Z'
        };

        it('should successfully fetch user info with valid access token', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    data: [mockUserData]
                })
            });

            const result = await twitchStreamerService.getUserInfo(mockAccessToken);

            expect(fetch).toHaveBeenCalledWith(
                'https://api.twitch.tv/helix/users',
                {
                    headers: {
                        'Authorization': `Bearer ${mockAccessToken}`,
                        'Client-Id': process.env.TWITCH_CLIENT_ID
                    }
                }
            );

            expect(result).toEqual(mockUserData);
        });

        it('should throw error when access token is missing', async () => {
            await expect(twitchStreamerService.getUserInfo()).rejects.toThrow('Access token is required');
        });

        it('should throw error when API returns non-ok response', async () => {
            const errorMessage = 'Invalid access token';
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    message: errorMessage
                })
            });

            await expect(twitchStreamerService.getUserInfo(mockAccessToken))
                .rejects
                .toThrow(`Failed to get user info: ${errorMessage}`);
        });

        it('should throw error when API returns empty data array', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    data: []
                })
            });

            await expect(twitchStreamerService.getUserInfo(mockAccessToken))
                .rejects
                .toThrow('No user data returned from Twitch');
        });
    });

    describe('handleOAuthSignup', () => {
        const mockCode = 'test-auth-code';
        const mockAccessToken = 'test-access-token';
        const mockRefreshToken = 'test-refresh-token';
        const mockExpiresIn = 3600;
        const mockUserData = {
            id: '123456789',
            login: 'testuser',
            display_name: 'TestUser',
            type: '',
            broadcaster_type: 'partner',
            description: 'Test channel description',
            profile_image_url: 'https://example.com/profile.jpg',
            offline_image_url: 'https://example.com/offline.jpg',
            view_count: 1000,
            created_at: '2020-01-01T00:00:00Z'
        };
        const mockReward = {
            id: 'reward-123',
            title: '100 Smash Factory Tokens'
        };

        beforeEach(() => {
            // Mock all internal methods
            jest.spyOn(twitchStreamerService, 'exchangeCodeForToken').mockImplementation();
            jest.spyOn(twitchStreamerService, 'getUserInfo').mockImplementation();
            jest.spyOn(twitchStreamerService, 'createCustomReward').mockImplementation();
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should successfully complete OAuth signup flow', async () => {
            // Mock the internal methods
            twitchStreamerService.exchangeCodeForToken.mockResolvedValueOnce({
                access_token: mockAccessToken,
                refresh_token: mockRefreshToken,
                expires_in: mockExpiresIn
            });

            twitchStreamerService.getUserInfo.mockResolvedValueOnce(mockUserData);
            twitchStreamerService.createCustomReward.mockResolvedValueOnce(mockReward);

            const result = await twitchStreamerService.handleOAuthSignup(mockCode);

            expect(twitchStreamerService.exchangeCodeForToken).toHaveBeenCalledWith(mockCode);
            expect(twitchStreamerService.getUserInfo).toHaveBeenCalledWith(mockAccessToken);
            expect(twitchStreamerService.createCustomReward).toHaveBeenCalledWith(mockAccessToken, mockUserData.id);

            expect(result).toEqual({
                user: mockUserData,
                accessToken: mockAccessToken,
                refreshToken: mockRefreshToken,
                tokenExpiresAt: expect.any(Number),
                reward: mockReward
            });

            const expectedExpiry = Date.now() + (mockExpiresIn * 1000);
            expect(result.tokenExpiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000);
            expect(result.tokenExpiresAt).toBeLessThanOrEqual(expectedExpiry + 1000);
        });

        it('should throw error when token exchange fails', async () => {
            const errorMessage = 'Invalid authorization code';
            twitchStreamerService.exchangeCodeForToken.mockRejectedValueOnce(new Error(errorMessage));

            await expect(twitchStreamerService.handleOAuthSignup(mockCode))
                .rejects
                .toThrow(errorMessage);
        });

        it('should throw error when user info fetch fails', async () => {
            twitchStreamerService.exchangeCodeForToken.mockResolvedValueOnce({
                access_token: mockAccessToken,
                refresh_token: mockRefreshToken,
                expires_in: mockExpiresIn
            });

            const errorMessage = 'Invalid access token';
            twitchStreamerService.getUserInfo.mockRejectedValueOnce(new Error(errorMessage));

            await expect(twitchStreamerService.handleOAuthSignup(mockCode))
                .rejects
                .toThrow(errorMessage);
        });

        it('should throw error when custom reward creation fails', async () => {
            twitchStreamerService.exchangeCodeForToken.mockResolvedValueOnce({
                access_token: mockAccessToken,
                refresh_token: mockRefreshToken,
                expires_in: mockExpiresIn
            });

            twitchStreamerService.getUserInfo.mockResolvedValueOnce(mockUserData);

            const errorMessage = 'Insufficient permissions';
            twitchStreamerService.createCustomReward.mockRejectedValueOnce(new Error(errorMessage));

            await expect(twitchStreamerService.handleOAuthSignup(mockCode))
                .rejects
                .toThrow(errorMessage);
        });
    });

    describe('exchangeCodeForToken', () => {
        const mockCode = 'test-auth-code';
        const mockTokenResponse = {
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
            scope: 'channel:read:redemptions'
        };

        it('should successfully exchange code for token', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockTokenResponse
            });

            const result = await twitchStreamerService.exchangeCodeForToken(mockCode);

            expect(fetch).toHaveBeenCalledWith(
                'https://id.twitch.tv/oauth2/token',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: expect.any(URLSearchParams)
                }
            );

            expect(result).toEqual(mockTokenResponse);
        });

        it('should throw error when API returns non-ok response', async () => {
            const errorMessage = 'Invalid authorization code';
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    message: errorMessage
                })
            });

            await expect(twitchStreamerService.exchangeCodeForToken(mockCode))
                .rejects
                .toThrow(`Failed to exchange code for token: ${errorMessage}`);
        });
    });

    describe('createCustomReward', () => {
        const mockAccessToken = 'test-access-token';
        const mockBroadcasterId = '123456789';
        const mockReward = {
            id: 'reward-123',
            title: '100 Smash Factory Tokens'
        };

        it('should successfully create custom reward', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    data: [mockReward]
                })
            });

            const result = await twitchStreamerService.createCustomReward(mockAccessToken, mockBroadcasterId);

            expect(fetch).toHaveBeenCalledWith(
                `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${mockBroadcasterId}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${mockAccessToken}`,
                        'Client-Id': process.env.TWITCH_CLIENT_ID,
                        'Content-Type': 'application/json'
                    },
                    body: expect.any(String)
                }
            );

            expect(result).toEqual({
                id: mockReward.id,
                title: mockReward.title
            });
        });

        it('should throw error when API returns non-ok response', async () => {
            const errorMessage = 'Insufficient permissions';
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    message: errorMessage
                })
            });

            await expect(twitchStreamerService.createCustomReward(mockAccessToken, mockBroadcasterId))
                .rejects
                .toThrow(`Failed to create custom reward: ${errorMessage}`);
        });
    });
});
