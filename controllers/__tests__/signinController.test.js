const request = require('supertest');
const mongoose = require('mongoose');
const { dbConnect, dbDisconnect } = require('@root/mongoTestConfig');
const jwt = require('jsonwebtoken');
const app = require('@root/server');
const Streamer = require('@models/streamer');
const originalEnv = process.env;
const mockTwitchResponses = require('../__fixtures__/twitchAuth.fixture');
const { createStreamer } = require('@models/__fixtures__/streamer.fixture');

// Mock twitchSigninService
jest.mock('@services/twitchStreamerService', () => ({
    getUserInfo: jest.fn()
}));

const { getUserInfo } = require('@services/twitchStreamerService');

// Mock fetch for Twitch OAuth requests
global.fetch = jest.fn();

describe('Signin Controller', () => {
    beforeEach(async () => {
        await dbConnect();

        // Reset mocks
        fetch.mockReset();
        getUserInfo.mockReset();

        // Set up test environment variables
        process.env = {
            ...originalEnv,
            TWITCH_CLIENT_ID: mockTwitchResponses.requestParams.client_id,
            TWITCH_CLIENT_SECRET: mockTwitchResponses.requestParams.client_secret,
            TWITCH_REDIRECT_URI: mockTwitchResponses.requestParams.redirect_uri,
            JWT_SECRET: 'test-jwt-secret'
        };

        // Mock successful user info fetch by default
        getUserInfo.mockResolvedValue(mockTwitchResponses.userInfoResponse);
    });

    afterEach(async () => {
        await dbDisconnect();
        process.env = originalEnv;
    });

    describe('POST /signin', () => {
        it('should create new streamer and return JWT token for first-time signin', async () => {
            fetch.mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockTwitchResponses.tokenResponse)
                })
            );

            const response = await request(app)
                .post('/signin')
                .query({ code: mockTwitchResponses.requestParams.code });

            expect(response.status).toBe(200);
            expect(response.body.token).toBeTruthy();

            expect(getUserInfo).toHaveBeenCalledWith(mockTwitchResponses.tokenResponse.access_token);
            const decodedToken = jwt.verify(response.body.token, process.env.JWT_SECRET);
            expect(decodedToken.streamerId).toBeTruthy();

            const streamer = await Streamer.findOne({
                'twitchProfile.id': mockTwitchResponses.userInfoResponse.id
            });
            expect(streamer).toBeTruthy();
        });

        it('should return JWT token for existing streamer', async () => {
            const existingStreamer = await createStreamer({
                twitchProfile: {
                    id: mockTwitchResponses.userInfoResponse.id,
                    displayName: mockTwitchResponses.userInfoResponse.display_name
                }
            });

            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockTwitchResponses.tokenResponse)
                })
            );

            getUserInfo.mockResolvedValueOnce(mockTwitchResponses.userInfoResponse);

            const response = await request(app)
                .post('/signin')
                .query({ code: mockTwitchResponses.requestParams.code });

            expect(response.status).toBe(200);
            expect(response.body.token).toBeTruthy();

            const decodedToken = jwt.verify(response.body.token, process.env.JWT_SECRET);
            expect(decodedToken.streamerId).toBe(existingStreamer._id.toString());

            const streamerCount = await Streamer.countDocuments();
            expect(streamerCount).toBe(1);
        });

        it('should return 400 when code is missing', async () => {
            const response = await request(app)
                .post('/signin');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Malformed Oauth Request');
        });

        it('should return 400 when OAuth token request fails with invalid code', async () => {
            // Mock failed OAuth token request
            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: false,
                    status: mockTwitchResponses.errorResponses.invalidCode.status,
                    json: () => Promise.resolve(mockTwitchResponses.errorResponses.invalidCode)
                })
            );

            const response = await request(app)
                .post('/signin')
                .query({ code: 'invalid-code' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Error fetching oauth token');
        });

        it('should return 400 when OAuth token request fails with invalid client', async () => {
            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: false,
                    status: mockTwitchResponses.errorResponses.invalidClient.status,
                    json: () => Promise.resolve(mockTwitchResponses.errorResponses.invalidClient)
                })
            );

            const response = await request(app)
                .post('/signin')
                .query({ code: mockTwitchResponses.requestParams.code });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Error fetching oauth token');
        });

        it('should handle network errors gracefully', async () => {
            // Mock network error
            fetch.mockImplementationOnce(() => 
                Promise.reject(new Error('Network error'))
            );

            const response = await request(app)
                .post('/signin')
                .query({ code: mockTwitchResponses.requestParams.code });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Error fetching oauth token');
        });
    });
});
