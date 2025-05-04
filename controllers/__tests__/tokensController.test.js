const request = require('supertest');
const app = require('../../server');
const { dbConnect, dbDisconnect } = require('../../mongoTestConfig');
const jwt = require('jsonwebtoken');
const User = require('../../models/viewer');
const Token = require('../../models/token');

const originalEnv = process.env;

beforeEach(async () => {
    await dbConnect();

    // The secret should be base64 encoded as provided by Twitch
    process.env = { ...originalEnv, TWITCH_EXTENSION_SECRET: 'test-secret' }; // base64 encoded 'test-secret'
}); 

afterEach(async () => {
    await dbDisconnect();

    process.env = originalEnv;
});

describe('TokensController', () => {
    it('should get tokens for current viewer', async () => {
        const user = {
            twitchProfile: {
                id: '12345'
            }
        }

        // Decode the base64 secret before using it to sign
        const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
        const validToken = jwt.sign({ user_id: '12345' }, secret);

        const createdUser = await User.create(user);

        await Token.create({
            viewerId: createdUser.twitchProfile.id,
            streamerId: '67890',
            platform: "twitch",
            source: "channel_points",
            tier: 1,
            redeemedAt: null
        })

        const response = await request(app)
            .get('/tokens?streamerId=67890')
            .set('Authorization', `Bearer ${validToken}`)
            .set('X-Auth-Source', 'extension');

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0].tier).toBe(1);
        expect(response.body[0].streamerId).toBe('67890');
        expect(response.body[0].redeemedAt).toBeNull();
    })
})
