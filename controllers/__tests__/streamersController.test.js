const request = require('supertest');
const { dbConnect, dbDisconnect } = require('@root/mongoTestConfig');
const app = require('@root/server');
const Streamer = require('@models/streamer');
const { createStreamer } = require('@models/__fixtures__/streamer.fixture');
const { createViewer } = require('@models/__fixtures__/viewer.fixture');
const jwt = require('jsonwebtoken');

describe('Streamers Controller', () => {
    const originalEnv = process.env;

    beforeAll(() => {
        process.env = {
            ...originalEnv,
            JWT_SECRET: 'test-secret'
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    beforeEach(async () => {
        await dbConnect();
    });

    afterEach(async () => {
        await dbDisconnect();
    });

    describe('PUT /streamers', () => {
        let streamer;
        let viewer;

        beforeEach(async () => {
            streamer = await createStreamer();
            viewer = await createViewer();
        });

        it('should successfully update streamer itemsEnabled', async () => {
            streamer.itemsEnabled = false;
            await streamer.save();

            const validToken = jwt.sign({ streamerId: streamer._id }, process.env.JWT_SECRET);

            const response = await request(app)
                .put('/streamers')
                .set('X-Auth-Source', 'client')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ itemsEnabled: true });

            expect(response.status).toBe(200);
            expect(response.body).toBe("");

            const updatedStreamer = await Streamer.findById(streamer._id);
            expect(updatedStreamer.itemsEnabled).toBe(true);
        });

        it('should return 400 when itemsEnabled is missing in request body', async () => {
            const validToken = jwt.sign({ streamerId: streamer._id }, process.env.JWT_SECRET);

            const response = await request(app)
                .put('/streamers')
                .set('X-Auth-Source', 'client')
                .set('Authorization', `Bearer ${validToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('itemsEnabled is required');
        });
    });
}); 