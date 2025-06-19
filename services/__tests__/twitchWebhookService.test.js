const Token = require('@models/token');
const { dbConnect, dbDisconnect } = require('@root/mongoTestConfig');
const fs = require('fs');
const path = require('path');
const { handleChannelPointRedemption, handleBitsTransactionCreate } = require('../twitchWebhookService');
const { createViewer } = require('@models/__fixtures__/viewer.fixture');
const { createStreamer } = require('@models/__fixtures__/streamer.fixture');

describe('Twitch Webhook Service', () => {
    let viewer, streamer;

    beforeEach(async () => {
        await dbConnect();
    });

    afterEach(async () => {
        await dbDisconnect();
    });

    describe('handleChannelPointRedemption', () => {
        const payload = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, './__fixtures__/channelPointRedemptionWebhook.json'),
                'utf8'
            )
        );
        beforeEach(async () => {
            viewer = await createViewer({ twitchProfile: { id: payload.event.user_id, displayName: 'Testie' } });
            streamer = await createStreamer({ twitchProfile: { id: payload.event.broadcaster_user_id, displayName: 'TestStreamer' } });
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

        it('creates the correct number of tokens for the user based on the reward title and responds with success', async () => {
            // Set a test reward title with a specific token amount
            payload.event.reward.title = '7 Smash Factory Tokens';
            const req = { body: { event: payload.event } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                send: jest.fn()
            };

            await handleChannelPointRedemption(req, res);

            const tokens = await Token.find({
                viewerId: viewer._id,
                streamerId: streamer._id,
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
            payload.event.reward.title = '3 Smash Factory Token';
            const req = { body: { event: payload.event } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                send: jest.fn()
            };

            await handleChannelPointRedemption(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            res.status.mockClear();

            // Second call with same event ID - should not create more tokens
            await handleChannelPointRedemption(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            const tokens = await Token.find({
                viewerId: viewer._id,
                streamerId: streamer._id,
                sourceEventId: payload.event.id,
                source: 'channel_points',
            });
            expect(tokens.length).toBe(3);
        });
    });

    describe('handleBitsTransactionCreate', () => {
        const payload = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, './__fixtures__/extensionBitsCreateWebhook.json'),
                'utf8'
            )
        );

        beforeEach(async () => {
            viewer = await createViewer({ twitchProfile: { id: payload.event.user_id, displayName: 'Testie' } });
            streamer = await createStreamer({ twitchProfile: { id: payload.event.broadcaster_user_id, displayName: 'TestStreamer' } });
        });

        it('creates the correct number of tokens for the user based on the sku and responds with success', async () => {
            // Set a test SKU with a specific token amount
            payload.event.product.sku = '5_tokens';
            const req = { body: { event: payload.event } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                send: jest.fn()
            };

            await handleBitsTransactionCreate(req, res);

            const tokens = await Token.find({
                viewerId: viewer._id,
                streamerId: streamer._id,
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
            payload.event.product.sku = '3_tokens';
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
                viewerId: viewer._id,
                streamerId: streamer._id,
                sourceEventId: payload.event.id,
                source: 'bits',
            });
            expect(tokens.length).toBe(3);
        });
    });
});


