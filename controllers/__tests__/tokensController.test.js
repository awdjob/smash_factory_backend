const request = require('supertest');
const app = require('@root/server');
const { dbConnect, dbDisconnect } = require('@root/mongoTestConfig');
const jwt = require('jsonwebtoken');
const User = require('@models/viewer');
const Token = require('@models/token');
const Streamer = require('@models/streamer');
const StreamerItem = require('@models/streamerItem');
const { createStreamer } = require('@models/__fixtures__/streamer.fixture');
const { createViewer } = require('@models/__fixtures__/viewer.fixture');
const { createMasterItems } = require('@models/__fixtures__/masterItem.fixture');
const { createStreamerItems } = require('@models/__fixtures__/streamerItem.fixture');
const { broadcastEvent } = require('@root/services/eventService');

// Mock the broadcast service
jest.mock('@root/services/eventService', () => {
    const clients = new Map();
    return {
        broadcastEvent: jest.fn(),
        clients
    };
});


const { clients } = require('@root/services/eventService');

describe('TokensController', () => {
    const originalEnv = process.env;

    let streamer, viewer;
    beforeEach(async () => {
        await dbConnect();
        process.env = { ...originalEnv, TWITCH_EXTENSION_SECRET: 'test-secret' };

        viewer = await createViewer();
        streamer = await createStreamer();
        clients.set(streamer.channelId, { write: jest.fn() });
    });

    afterEach(async () => {
        await dbDisconnect();

        process.env = originalEnv;

        // Clean up fake timers
        jest.useRealTimers();
        jest.clearAllMocks();
        clients.clear();
    });
    describe('GET /tokens', () => {
        it('should get tokens for current viewer', async () => {
            // Decode the base64 secret before using it to sign
            const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
            const validToken = jwt.sign({ user_id: viewer.twitchProfile.id }, secret);

            await Token.create({
                viewerId: viewer.twitchProfile.id,
                streamerId: streamer.twitchProfile.id,
                platform: "twitch",
                source: "channel_points",
                sourceEventId: "12345",
                redeemedAt: null
            })

            const response = await request(app)
                .get('/tokens?streamerId=67890')
                .set('Authorization', `Bearer ${validToken}`)
                .set('X-Auth-Source', 'extension');

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].streamerId).toBe('67890');
            expect(response.body[0].redeemedAt).toBeNull();
        })

        it('should handle when streamerId is not provided', async () => {
            const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
            const validToken = jwt.sign({ user_id: viewer.twitchProfile.id }, secret);

            await Token.create({
                viewerId: viewer.twitchProfile.id,
                streamerId: streamer.twitchProfile.id,
                platform: "twitch",
                source: "channel_points",
                sourceEventId: "12345",
                redeemedAt: null
            });

            const response = await request(app)
                .get('/tokens')
                .set('Authorization', `Bearer ${validToken}`)
                .set('X-Auth-Source', 'extension');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('streamerId is required');
        });
    })

    describe('POST /redeem', () => {
        let masterItems, streamerItems;

        beforeEach(async () => {
            masterItems = await createMasterItems();
            streamerItems = await createStreamerItems(streamer._id, masterItems);
            clients.set(streamer.channelId, { write: jest.fn() });
        });

        it('should redeem tokens for an item and broadcast event with exact timestamp if streamer has items enabled', async () => {
            const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
            const validToken = jwt.sign({ user_id: viewer.twitchProfile.id, user_name: viewer.twitchProfile.displayName }, secret);

            streamer.itemsEnabled = true;
            await streamer.save();

            const tokens = await Promise.all([
                Token.create({
                    viewerId: viewer.twitchProfile.id,
                    streamerId: streamer.twitchProfile.id,
                    platform: "twitch",
                    source: "channel_points",
                    sourceEventId: "12345",
                    redeemedAt: null
                }),
                Token.create({
                    viewerId: viewer.twitchProfile.id,
                    streamerId: streamer.twitchProfile.id,
                    platform: "twitch",
                    source: "channel_points",
                    sourceEventId: "12346",
                    redeemedAt: null
                })
            ]);

            const tokenIds = tokens.map(t => t._id);
            const itemId = streamerItems[0].masterItemId;
            await StreamerItem.findOneAndUpdate({
                streamerId: streamer._id,
                masterItemId: itemId
            }, {
                $set: {
                    price: 1
                }
            })

            const response = await request(app)
                .post('/redeem')
                .set('Authorization', `Bearer ${validToken}`)
                .set('X-Auth-Source', 'extension')
                .send({
                    streamerId: streamer.twitchProfile.id,
                    itemId,
                    tokenIds,
                    xCoord: 0
                });

            expect(response.status).toBe(200);
            expect(response.body).toBe("");

            const redeemedTokens = await Token.find({
                _id: { $in: tokenIds },
                redeemedAt: { $ne: null },
                redeemedFor: itemId
            });

            expect(redeemedTokens).toHaveLength(tokenIds.length);

            expect(broadcastEvent).toHaveBeenCalledTimes(1);
            expect(broadcastEvent).toHaveBeenCalledWith(streamer.channelId, {
                type: 'spawn_item',
                data: {
                    itemId,
                    coords: {
                        x: 0
                    }
                }
            });
        });

        it('should handle when the user does not have enough tokens', async () => {
            const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
            const validToken = jwt.sign({ user_id: viewer.twitchProfile.id, user_name: viewer.twitchProfile.displayName }, secret);

            const response = await request(app)
                .post('/redeem')
                .set('Authorization', `Bearer ${validToken}`)
                .set('X-Auth-Source', 'extension')
                .send({
                    streamerId: streamer.twitchProfile.id,
                    itemId: streamerItems[0].masterItemId,
                    tokenIds: [],
                    xCoord: 0
                });

            const masterItem = masterItems.find(item => item.itemId === streamerItems[0].masterItemId);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(`Not enough tokens. You need ${streamerItems[0].price} tokens to spawn ${masterItem.name}`);
        });

        it('should handle when the item is not found', async () => {
            const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
            const validToken = jwt.sign({ user_id: viewer.twitchProfile.id, user_name: viewer.twitchProfile.displayName }, secret);

            const response = await request(app)
                .post('/redeem')
                .set('Authorization', `Bearer ${validToken}`)
                .set('X-Auth-Source', 'extension')
                .send({
                    streamerId: streamer.twitchProfile.id,
                    itemId: 69,
                    tokenIds: [],
                    xCoord: 0
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Item not found');
        });

        it('should handle when the streamer is not found', async () => {
            const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
            const validToken = jwt.sign({ user_id: viewer.twitchProfile.id, user_name: viewer.twitchProfile.displayName }, secret);

            const response = await request(app)
                .post('/redeem')
                .set('Authorization', `Bearer ${validToken}`)
                .set('X-Auth-Source', 'extension')
                .send({
                    streamerId: '99999',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Streamer not found');
        });

        it('should handle when the streamer has items disabled', async () => {
            const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
            const validToken = jwt.sign({ user_id: viewer.twitchProfile.id, user_name: viewer.twitchProfile.displayName }, secret);

            streamer.itemsEnabled = false;
            await streamer.save();

            const response = await request(app)
                .post('/redeem')
                .set('Authorization', `Bearer ${validToken}`)
                .set('X-Auth-Source', 'extension')
                .send({
                    streamerId: streamer.twitchProfile.id,
                    itemId: streamerItems[0].masterItemId,
                    tokenIds: [],
                    xCoord: 0
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Items are currently disabled for this streamer');
        });

        it('should handle when the streamer is not in the clients map', async () => {
            const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
            const validToken = jwt.sign({ user_id: viewer.twitchProfile.id, user_name: viewer.twitchProfile.displayName }, secret);

            streamer.itemsEnabled = true;
            streamer.channelId = 'non_existent_channel_id';
            await streamer.save();

            const tokens = await Promise.all([
                Token.create({
                    viewerId: viewer.twitchProfile.id,
                    streamerId: streamer.twitchProfile.id,
                    platform: "twitch",
                    source: "channel_points",
                    sourceEventId: "12345",
                    redeemedAt: null
                })
            ]);

            const tokenIds = tokens.map(t => t._id);
            const itemId = streamerItems[0].masterItemId;

            const response = await request(app)
                .post('/redeem')
                .set('Authorization', `Bearer ${validToken}`)
                .set('X-Auth-Source', 'extension')
                .send({
                    streamerId: streamer.twitchProfile.id,
                    itemId,
                    tokenIds,
                    xCoord: 0
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Streamer is not connected to Smash Factory client');
        });
    })
})
