const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createViewer } = require('@models/__fixtures__/viewer.fixture');
const app = require('../../server');
const { dbConnect, dbDisconnect } = require('../../mongoTestConfig');

const originalEnv = process.env;

describe('ViewerAuth Middleware', () => {
    beforeEach(async () => {
        await dbConnect();
        const base64Secret = Buffer.from('test-secret').toString('base64');
        process.env = { ...originalEnv, TWITCH_EXTENSION_SECRET: base64Secret };
        mockToken = jwt.sign(
            { user_id: mockUser.twitchProfile.id, user_name: mockUser.twitchProfile.displayName },
            'test-secret'
        );
    });

    afterEach(async () => {
        await dbDisconnect();
        process.env = originalEnv;
    });

    let mockUser = {
        twitchProfile: {
            id: '12345',
            displayName: 'testUser'
        }
    }

    let viewer, validToken;
    beforeEach(async () => {
        viewer = await createViewer();
        validToken = jwt.sign(
            { user_id: viewer.twitchProfile.id, user_name: viewer.twitchProfile.displayName },
            'test-secret'
        );
    });

    it('should authenticate existing user', async () => {
        const response = await request(app)
            .get('/viewer_test')
            .set('X-Auth-Source', 'extension')
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body.user.twitchProfile.id).toBe(viewer.twitchProfile.id);
    });

    it('should create new user if not exists', async () => {
        const response = await request(app)
            .get('/viewer_test')
            .set('X-Auth-Source', 'extension')
            .set('Authorization', `Bearer ${mockToken}`);

        expect(response.status).toBe(200);
        expect(response.body.user.twitchProfile.id).toBe(mockUser.twitchProfile.id);
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
