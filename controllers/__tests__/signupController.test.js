const request = require('supertest');
const { dbConnect, dbDisconnect } = require('@root/mongoTestConfig');
const jwt = require('jsonwebtoken');
const app = require('@root/server');
const Streamer = require('@models/streamer');
const originalEnv = process.env;

describe('Signups Controller', () => {
    let TWITCH_EXTENSION_SECRET;
    beforeEach(async () => {
        await dbConnect();
    
        process.env = { ...originalEnv, TWITCH_EXTENSION_SECRET: 'test-secret' };
        TWITCH_EXTENSION_SECRET = process.env.TWITCH_EXTENSION_SECRET;
    });
    
    afterEach(async () => {
        await dbDisconnect();
    
        process.env = originalEnv;
    });

    const mockTwitchUser = {
        user_id: '123456',
        user_name: 'testStreamer'
    };

    const generateValidToken = () => {
        const secret = Buffer.from(TWITCH_EXTENSION_SECRET, 'base64');
        return jwt.sign(mockTwitchUser, secret);
    };

    describe('POST /signup', () => {
        it('should create a new streamer with valid token', async () => {
            const validToken = generateValidToken();

            const response = await request(app)
                .post('/signup')
                .send({ token: validToken });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe("Streamer created");

            const streamer = await Streamer.findOne({
                'twitchProfile.id': mockTwitchUser.user_id
            });
            expect(streamer).toBeTruthy();
            expect(streamer.twitchProfile.displayName).toBe(mockTwitchUser.user_name);
        });

        it('should return 400 when token is missing', async () => {
            const response = await request(app)
                .post('/signup')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('JWT is required');
        });

        it('should return 400 when token is invalid', async () => {
            const response = await request(app)
                .post('/signup')
                .send({ token: 'invalid-token' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid JWT');
        });

        it('should return 400 when token is missing user_id', async () => {
            const secret = Buffer.from(TWITCH_EXTENSION_SECRET, 'base64');
            const invalidToken = jwt.sign({ user_name: 'test' }, secret);

            const response = await request(app)
                .post('/signup')
                .send({ token: invalidToken });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid User');
        });

        it('should return 200 when streamer already exists', async () => {
            await Streamer.create({
                twitchProfile: {
                    id: mockTwitchUser.user_id,
                    displayName: mockTwitchUser.user_name
                }
            });

            const validToken = generateValidToken();

            const response = await request(app)
                .post('/signup')
                .send({ token: validToken });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Streamer already exists');
        });
    });
}); 