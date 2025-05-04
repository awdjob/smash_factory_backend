const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/viewer');
const app = require('../../server');
const { dbConnect, dbDisconnect } = require('../../mongoTestConfig');

const originalEnv = process.env;

beforeEach(async () => {
    await dbConnect();
    process.env = { ...originalEnv, TWITCH_EXTENSION_SECRET: 'test-secret' };
});

afterEach(async () => {
    await dbDisconnect();
    process.env = originalEnv;
});

describe('ViewerAuth Middleware', () => {
    let mockUser;
    let validToken;

    beforeEach(async () => {
        mockUser = {
            twitchProfile: {
                id: '12345'
            }
        };
        // Decode the base64 secret before using it to sign
        const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
        validToken = jwt.sign({ user_id: '12345' }, secret);
    });
    
    it('should authenticate existing user', async () => {
        await User.create(mockUser);

        const response = await request(app)
            .get('/viewer_test')
            .set('X-Auth-Source', 'extension')
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body.user.twitchProfile.id).toBe('12345');
    });

    it('should create new user if not exists', async () => {
        // Make request with valid token but no existing user
        const response = await request(app)
            .get('/viewer_test')
            .set('X-Auth-Source', 'extension')
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        
        // Verify user was created
        const createdUser = await User.findOne({ 'twitchProfile.id': '12345' });
        expect(createdUser).toBeTruthy();
        expect(createdUser.twitchProfile.id).toBe('12345');
    });

    it('should handle invalid token', async () => {
        const response = await request(app)
            .get('/viewer_test')
            .set('X-Auth-Source', 'extension')
            .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(400);
    });

    it('should handle missing auth source', async () => {
        const response = await request(app)
            .get('/viewer_test')
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(400);
    });
});
