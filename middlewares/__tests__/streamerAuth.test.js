const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('@root/server');
const { dbConnect, dbDisconnect } = require('@root/mongoTestConfig');
const { createStreamer } = require('@models/__fixtures__/streamer.fixture');

const originalEnv = process.env;

beforeEach(async () => {
    await dbConnect();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret' };
});

afterEach(async () => {
    await dbDisconnect();
    process.env = originalEnv;
});

describe('StreamerAuth Middleware', () => {
    let mockStreamer;
    let validToken;

    beforeEach(async () => {
        // Create a mock streamer using the fixture
        mockStreamer = await createStreamer({
            twitchProfile: {
                id: '12345',
                displayName: 'testStreamer'
            }
        });

        // Create a valid JWT token
        validToken = jwt.sign(
            { streamerId: mockStreamer._id.toString() },
            process.env.JWT_SECRET
        );
    });
    
    it('should authenticate existing streamer', async () => {
        const response = await request(app)
            .get('/streamer_test')
            .set('Authorization', `Bearer ${validToken}`)
            .set('X-Auth-Source', 'client');
        
        expect(response.status).toBe(200);
        expect(response.body.streamer._id.toString()).toBe(mockStreamer._id.toString());
        expect(response.body.streamer.twitchProfile.displayName).toBe('testStreamer');
    });

    it('should handle invalid token', async () => {
        const response = await request(app)
            .get('/streamer_test')
            .set('Authorization', 'Bearer invalid-token')
            .set('X-Auth-Source', 'client');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid Access Token');
    });

    it('should handle missing token', async () => {
        const response = await request(app)
            .get('/streamer_test');

        expect(response.status).toBe(400);
    });

    it('should handle token with invalid streamerId', async () => {
        // Create token with non-existent streamerId
        const invalidToken = jwt.sign(
            { streamerId: '507f1f77bcf86cd799439011' }, // Random MongoDB ID
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .get('/streamer_test')
            .set('Authorization', `Bearer ${invalidToken}`)
            .set('X-Auth-Source', 'client');

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Streamer Not Found');
    });

    it('should handle token without streamerId', async () => {
        // Create token without streamerId
        const invalidToken = jwt.sign(
            { someOtherField: 'value' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .get('/streamer_test')
            .set('Authorization', `Bearer ${invalidToken}`)
            .set('X-Auth-Source', 'client');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid Streamer Token');
    });

    it('should handle malformed authorization header', async () => {
        const response = await request(app)
            .get('/streamer_test')
            .set('Authorization', 'InvalidFormat');

        expect(response.status).toBe(400);
    });
});
