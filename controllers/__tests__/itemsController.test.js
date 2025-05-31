const request = require('supertest');
const app = require('@root/server');
const { dbConnect, dbDisconnect } = require('@root/mongoTestConfig');
const jwt = require('jsonwebtoken');
const { createViewer } = require('@models/__fixtures__/viewer.fixture');
const { createMasterItems } = require('@models/__fixtures__/masterItem.fixture');
const { createStreamer } = require('@models/__fixtures__/streamer.fixture');
const { createStreamerItems } = require('@models/__fixtures__/streamerItem.fixture');


const originalEnv = process.env;
let viewer;
let streamer;

beforeEach(async () => {
    await dbConnect();

    viewer = await createViewer();
    streamer = await createStreamer();
    const masterItems = await createMasterItems();
    await createStreamerItems(streamer.twitchProfile.id, masterItems);

    process.env = { ...originalEnv, TWITCH_CLIENT_SECRET: 'test-secret' };
});

afterEach(async () => {
    await dbDisconnect();

    process.env = originalEnv;
});

describe('ItemsController', () => {
    it('should return enabled items for a streamer', async () => {
        const secret = Buffer.from(process.env.TWITCH_CLIENT_SECRET, 'base64');
        const validToken = jwt.sign({ user_id: viewer.twitchProfile.id }, secret);

        const response = await request(app)
            .get(`/items?streamerId=${streamer.twitchProfile.id}`)
            .set('Authorization', `Bearer ${validToken}`)
            .set('X-Auth-Source', 'extension');


        const expectedItems = [
            { name: 'Heart', itemId: 5, price: 3, enabled: true },
            { name: 'Beam Sword', itemId: 15, price: null, enabled: false },
            { name: 'Poke Ball', itemId: 10, price: 7, enabled: true }
        ];

        expect(response.status).toBe(200);
        expect(response.body).toEqual(expectedItems);
    })
})
