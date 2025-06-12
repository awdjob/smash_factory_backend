const request = require('supertest');
const mongoose = require('mongoose');
const { dbConnect, dbDisconnect } = require('@root/mongoTestConfig');
const app = require('@root/server');
const Streamer = require('@models/streamer');
const { createStreamer } = require('@models/__fixtures__/streamer.fixture');

describe('Streamers Controller', () => {
    beforeEach(async () => {
        await dbConnect();
    });
    
    afterEach(async () => {
        await dbDisconnect();
    });

    describe('PUT /streamers', () => {
        let testStreamer;

        beforeEach(async () => {
            // Create a test streamer using the fixture
            testStreamer = await createStreamer();
        });

        it('should successfully update streamer itemsEnabled', async () => {
            const response = await request(app)
                .put('/streamers')
                .query({ streamerId: testStreamer._id })
                .send({ itemsEnabled: true });

            expect(response.status).toBe(200);
            expect(response.body.itemsEnabled).toBe(true);
            
            // Verify the update in the database
            const updatedStreamer = await Streamer.findById(testStreamer._id);
            expect(updatedStreamer.itemsEnabled).toBe(true);
        });

        it('should return 400 when streamerId is invalid', async () => {
            const response = await request(app)
                .put('/streamers')
                .query({ streamerId: 'invalid-id' })
                .send({ itemsEnabled: true });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Failed to update streamer');
        });

        it('should return 400 when streamerId is not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .put('/streamers')
                .query({ streamerId: nonExistentId })
                .send({ itemsEnabled: true });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Failed to update streamer');
        });

        it('should return 400 when itemsEnabled is missing in request body', async () => {
            const response = await request(app)
                .put('/streamers')
                .query({ streamerId: testStreamer._id })
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Failed to update streamer');
        });

        it('should return 400 when streamerId is missing in query', async () => {
            const response = await request(app)
                .put('/streamers')
                .send({ itemsEnabled: true });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Failed to update streamer');
        });
    });
}); 