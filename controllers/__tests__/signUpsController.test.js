const request = require('supertest');
const mongoose = require('mongoose');
const { dbConnect, dbDisconnect } = require('@root/mongoTestConfig');
const jwt = require('jsonwebtoken');
const app = require('@root/server');
const Streamer = require('@models/streamer');
const originalEnv = process.env;

describe('Signups Controller', () => {
    beforeEach(async () => {
        await dbConnect();
    
        process.env = { ...originalEnv, TWITCH_CLIENT_SECRET: 'test-secret' };
    });
    
    afterEach(async () => {
        await dbDisconnect();
    
        process.env = originalEnv;
    });

    const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
    const mockTwitchUser = {
        user_id: '123456',
        user_name: 'testStreamer'
    };

    const generateValidToken = () => {
        console.log("TWITCH_CLIENT_SECRET:", TWITCH_CLIENT_SECRET);
        const secret = Buffer.from(TWITCH_CLIENT_SECRET, 'base64');
        return jwt.sign(mockTwitchUser, secret);
    };

    describe('POST /signups', () => {
        it('should create a new streamer with valid token', async () => {
            const validToken = generateValidToken();

            const response = await request(app)
                .post('/signups')
                .send({ token: validToken });

            // console.log(response);

            expect(response.status).toBe(200);

            const streamer = await Streamer.findOne({
                'twitchProfile.id': mockTwitchUser.user_id
            });
            expect(streamer).toBeTruthy();
            expect(streamer.twitchProfile.displayName).toBe(mockTwitchUser.user_name);
        });

        // it('should return 400 when token is missing', async () => {
        //     const response = await request(app)
        //         .post('/signups')
        //         .send({});

        //     expect(response.status).toBe(400);
        //     expect(response.body.message).toBe('Token is required');
        // });

        // it('should return 400 when token is invalid', async () => {
        //     const response = await request(app)
        //         .post('/signups')
        //         .send({ token: 'invalid-token' });

        //     expect(response.status).toBe(400);
        //     expect(response.body.message).toBe('Invalid Access Token');
        // });

        // it('should return 400 when token is missing user_id', async () => {
        //     const secret = Buffer.from(TWITCH_CLIENT_SECRET, 'base64');
        //     const invalidToken = jwt.sign({ user_name: 'test' }, secret);

        //     const response = await request(app)
        //         .post('/signups')
        //         .send({ token: invalidToken });

        //     expect(response.status).toBe(400);
        //     expect(response.body.message).toBe('Invalid User');
        // });

        // it('should return 400 when streamer already exists', async () => {
        //     // First create a streamer
        //     await Streamer.create({
        //         twitchProfile: {
        //             id: mockTwitchUser.user_id,
        //             displayName: mockTwitchUser.user_name
        //         }
        //     });

        //     const validToken = generateValidToken();

        //     const response = await request(app)
        //         .post('/signups')
        //         .send({ token: validToken });

        //     expect(response.status).toBe(400);
        //     expect(response.body.message).toBe('Streamer already exists');
        // });
    });
}); 