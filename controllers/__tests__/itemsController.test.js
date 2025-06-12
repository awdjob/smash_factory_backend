const request = require('supertest');
const app = require('@root/server');
const { dbConnect, dbDisconnect } = require('@root/mongoTestConfig');
const jwt = require('jsonwebtoken');
const { createViewer } = require('@models/__fixtures__/viewer.fixture');
const { createMasterItems } = require('@models/__fixtures__/masterItem.fixture');
const { createStreamer } = require('@models/__fixtures__/streamer.fixture');
const { createStreamerItems } = require('@models/__fixtures__/streamerItem.fixture');
const itemService = require('@services/itemService');
const Viewer = require('../../models/viewer');
const Streamer = require('../../models/streamer');

jest.mock('../../services/itemService');

const originalEnv = process.env;
let viewer;
let streamer;

beforeEach(async () => {
    await dbConnect();

    viewer = await createViewer();
    streamer = await createStreamer();
    const masterItems = await createMasterItems();
    await createStreamerItems(streamer.twitchProfile.id, masterItems);

    process.env = { ...originalEnv, TWITCH_EXTENSION_SECRET: 'test-secret' };

});

afterEach(async () => {
    await dbDisconnect();

    process.env = originalEnv;
    jest.clearAllMocks();
});

describe('ItemsController', () => {
    it('should call getEnabledItemsForStreamer with correct streamerId', async () => {
        const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
        const validToken = jwt.sign(
            { user_id: viewer.twitchProfile.id, user_name: viewer.twitchProfile.displayName }, 
            secret
        );

        // Mock the service function to return an empty array
        itemService.getEnabledItemsForStreamer.mockResolvedValue([]);

        await request(app)
            .get(`/items?streamerId=${streamer.twitchProfile.id}`)
            .set('Authorization', `Bearer ${validToken}`)
            .set('X-Auth-Source', 'extension');

        // Verify the service function was called with correct parameter
        expect(itemService.getEnabledItemsForStreamer)
            .toHaveBeenCalledWith(streamer._id);
        expect(itemService.getEnabledItemsForStreamer)
            .toHaveBeenCalledTimes(1);
    });
})
