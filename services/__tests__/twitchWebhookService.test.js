const request = require('supertest');
const app = require('../../server'); // Adjust if your express app is elsewhere
const Token = require('../../models/token'); // Adjust path as needed
const { dbConnect, dbDisconnect } = require('../../mongoTestConfig');
const fs = require('fs');
const path = require('path');
const { handleChannelPointRedemption, handleBitsTransactionCreate } = require('../twitchWebhookService');

describe('Twitch Webhook Service', () => {
    beforeEach(async () => {
        await dbConnect();
    });

    afterEach(async () => {
        await dbDisconnect();
    });

    describe('handleChannelPointRedemption', () => {
        it('creates a token for the user and responds with success', async () => {
            const payload = JSON.parse(
                fs.readFileSync(
                    path.join(__dirname, './__fixtures__/channelPointRedemptionWebhook.json'),
                    'utf8'
                )
            );

            const req = { body: { event: payload.event } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                send: jest.fn()
            };

            await handleChannelPointRedemption(req, res);

            const { user_id, broadcaster_user_id } = payload.event;
            const token = await Token.findOne({
                viewerId: user_id,
                streamerId: broadcaster_user_id,
                platform: "twitch",
            });

            expect(token).toBeTruthy();
            expect(token.source).toBe('channel_points');
            expect(token.sourceEventId).toBe(payload.event.id);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('responds with 400 for invalid reward title', async () => {
            const req = { body: { event: { reward: { title: 'Not a valid reward' } } } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                send: jest.fn()
            };

            await handleChannelPointRedemption(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith('Invalid reward title');
        });

        it('does not create duplicate tokens for the same event ID', async () => {
            const payload = JSON.parse(
                fs.readFileSync(
                    path.join(__dirname, './__fixtures__/channelPointRedemptionWebhook.json'),
                    'utf8'
                )
            );

            const req = { body: { event: payload.event } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                send: jest.fn()
            };

            // First call - should create token
            await handleChannelPointRedemption(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            // Reset mock functions
            res.status.mockClear();

            // Second call with same event ID - should not create duplicate
            await handleChannelPointRedemption(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            // Verify only one token exists
            const tokens = await Token.find({
                viewerId: payload.event.user_id,
                streamerId: payload.event.broadcaster_user_id,
                sourceEventId: payload.event.id
            });
            expect(tokens.length).toBe(1);
        });
    });

    describe('handleBitsTransactionCreate', () => {
        it('creates a token for the user and responds with success', async () => {
            const payload = JSON.parse(
                fs.readFileSync(
                    path.join(__dirname, './__fixtures__/extensionBitsCreateWebhook.json'),
                    'utf8'
                )
            );

            const req = { body: { event: payload.event } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                send: jest.fn()
            };

            await handleBitsTransactionCreate(req, res);

            const { user_id, broadcaster_user_id } = payload.event;
            const token = await Token.findOne({
                viewerId: user_id,
                streamerId: broadcaster_user_id,
                platform: "twitch",
            });

            expect(token).toBeTruthy();
            expect(token.source).toBe('bits');
            expect(token.sourceEventId).toBe(payload.event.id);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('does not create duplicate tokens for the same event ID', async () => {
            const payload = JSON.parse(
                fs.readFileSync(
                    path.join(__dirname, './__fixtures__/extensionBitsCreateWebhook.json'),
                    'utf8'
                )
            );

            const req = { body: { event: payload.event } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                send: jest.fn()
            };

            // First call - should create token
            await handleBitsTransactionCreate(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            // Reset mock functions
            res.status.mockClear();

            // Second call with same event ID - should not create duplicate
            await handleBitsTransactionCreate(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            // Verify only one token exists
            const tokens = await Token.find({
                viewerId: payload.event.user_id,
                streamerId: payload.event.broadcaster_user_id,
                sourceEventId: payload.event.id
            });
            expect(tokens.length).toBe(1);
        });
    });
});


