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

        it('creates the correct number of tokens for the user based on the reward title and responds with success', async () => {
            const payload = JSON.parse(
                fs.readFileSync(
                    path.join(__dirname, './__fixtures__/channelPointRedemptionWebhook.json'),
                    'utf8'
                )
            );

            // Set a test reward title with a specific token amount
            payload.event.reward.title = '7 Smash Factory Tokens';
            const req = { body: { event: payload.event } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                send: jest.fn()
            };

            await handleChannelPointRedemption(req, res);

            const { user_id, broadcaster_user_id } = payload.event;
            const tokens = await Token.find({
                viewerId: user_id,
                streamerId: broadcaster_user_id,
                platform: "twitch",
                source: "channel_points",
                sourceEventId: payload.event.id
            });

            expect(tokens.length).toBe(7);
            expect(tokens[0].source).toBe('channel_points');
            expect(tokens[0].sourceEventId).toBe(payload.event.id);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('does not create duplicate tokens for the same event ID and reward title', async () => {
            const payload = JSON.parse(
                fs.readFileSync(
                    path.join(__dirname, './__fixtures__/channelPointRedemptionWebhook.json'),
                    'utf8'
                )
            );
            payload.event.reward.title = '3 Smash Factory Token';
            const req = { body: { event: payload.event } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                send: jest.fn()
            };

            // First call - should create 3 tokens
            await handleChannelPointRedemption(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            res.status.mockClear();

            // Second call with same event ID - should not create more tokens
            await handleChannelPointRedemption(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            // Verify only 3 tokens exist
            const tokens = await Token.find({
                viewerId: payload.event.user_id,
                streamerId: payload.event.broadcaster_user_id,
                sourceEventId: payload.event.id,
                source: 'channel_points',
            });
            expect(tokens.length).toBe(3);
        });
    });

    describe('handleBitsTransactionCreate', () => {
        it('creates the correct number of tokens for the user based on the sku and responds with success', async () => {
            const payload = JSON.parse(
                fs.readFileSync(
                    path.join(__dirname, './__fixtures__/extensionBitsCreateWebhook.json'),
                    'utf8'
                )
            );

            // Set a test SKU with a specific token amount
            payload.event.product.sku = 'sf_token_5';
            const req = { body: { event: payload.event } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                send: jest.fn()
            };

            await handleBitsTransactionCreate(req, res);

            const { user_id, broadcaster_user_id } = payload.event;
            const tokens = await Token.find({
                viewerId: user_id,
                streamerId: broadcaster_user_id,
                platform: "twitch",
                source: "bits",
                sourceEventId: payload.event.id
            });

            expect(tokens.length).toBe(5);
            expect(tokens[0].source).toBe('bits');
            expect(tokens[0].sourceEventId).toBe(payload.event.id);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('does not create duplicate tokens for the same event ID and sku', async () => {
            const payload = JSON.parse(
                fs.readFileSync(
                    path.join(__dirname, './__fixtures__/extensionBitsCreateWebhook.json'),
                    'utf8'
                )
            );
            payload.event.product.sku = 'sf_token_3';
            const req = { body: { event: payload.event } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                send: jest.fn()
            };

            // First call - should create 3 tokens
            await handleBitsTransactionCreate(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            res.status.mockClear();

            // Second call with same event ID - should not create more tokens
            await handleBitsTransactionCreate(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            // Verify only 3 tokens exist
            const tokens = await Token.find({
                viewerId: payload.event.user_id,
                streamerId: payload.event.broadcaster_user_id,
                sourceEventId: payload.event.id,
                source: 'bits',
            });
            expect(tokens.length).toBe(3);
        });
    });
});


