const request = require('supertest');
const app = require('../../server'); // Make sure this points to your Express app
const { dbConnect, dbDisconnect } = require('../../mongoTestConfig');
const { createHmac } = require('crypto');
const twitchWebhookService = require('../../services/twitchWebhookService');

// Mock the webhook service with async functions that resolve
jest.mock('../../services/twitchWebhookService', () => ({
    handleChannelPointRedemption: jest.fn().mockImplementation((req, res) => {
        res.status(200).send('OK');
        return Promise.resolve();
    }),
    handleBitsTransactionCreate: jest.fn().mockImplementation((req, res) => {
        res.status(200).send('OK');
        return Promise.resolve();
    })
}));

// Helper function to create a Twitch webhook request with proper headers
const createTwitchWebhookRequest = (messageType, body, options = {}) => {
    const messageId = options.messageId || 'test-message-id';
    const timestamp = options.timestamp || '2024-01-01T00:00:00Z';
    const subscriptionType = options.subscriptionType || 'channel.channel_points_custom_reward_redemption.add';
    const subscriptionVersion = options.subscriptionVersion || '1';

    const headers = {
        'Twitch-Eventsub-Message-Id': messageId,
        'Twitch-Eventsub-Message-Timestamp': timestamp,
        'Twitch-Eventsub-Message-Type': messageType,
        'Twitch-Eventsub-Subscription-Type': subscriptionType,
        'Twitch-Eventsub-Subscription-Version': subscriptionVersion
    };

    // Add signature if this is a notification
    if (messageType === 'notification' && process.env.TWITCH_WEBHOOK_SECRET) {
        const hmacMessage = messageId + timestamp + JSON.stringify(body);
        const signature = 'sha256=' + createHmac('sha256', process.env.TWITCH_WEBHOOK_SECRET)
            .update(hmacMessage)
            .digest('hex');
        headers['Twitch-Eventsub-Message-Signature'] = signature;
    }

    return request(app)
        .post('/webhook/twitch')
        .set(headers)
        .send(body);
};

describe('Twitch Webhook Endpoint', () => {
    beforeEach(async () => {
        await dbConnect();
        process.env.TWITCH_WEBHOOK_SECRET = 'test_secret';
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await dbDisconnect();
    });

    describe('webhook verification', () => {
        it('should handle webhook verification challenge', async () => {
            const challenge = 'test_challenge';
            const response = await createTwitchWebhookRequest(
                'webhook_callback_verification',
                { challenge }
            );

            expect(response.status).toBe(200);
            expect(response.text).toBe(challenge);
        });
    });

    describe('signature verification', () => {
        it('should reject requests with invalid signatures', async () => {
            const body = { test: 'data' };
            const response = await createTwitchWebhookRequest(
                'notification',
                body,
                { messageId: 'test-message-id' }
            ).set('Twitch-Eventsub-Message-Signature', 'invalid-signature');

            expect(response.status).toBe(403);
            expect(response.text).toBe('Forbidden');
        });

        it('should accept requests with valid signatures', async () => {
            const body = { test: 'data' };
            const response = await createTwitchWebhookRequest(
                'notification',
                body
            );

            expect(response.status).toBe(403)
            expect(response.text).toBe('Unknown subscription type');
        });
    });

    describe('subscription type handling', () => {
        it('should handle channel points redemption', async () => {
            const body = {
                subscription: {
                    type: 'channel.channel_points_custom_reward_redemption.add'
                },
                event: {
                    reward: {
                        title: 'Test Reward'
                    },
                    user_name: 'test_user'
                }
            };

            const response = await createTwitchWebhookRequest(
                'notification',
                body,
                { subscriptionType: 'channel.channel_points_custom_reward_redemption.add' }
            );

            expect(response.status).toBe(200);
            expect(twitchWebhookService.handleChannelPointRedemption).toHaveBeenCalledWith(
                expect.objectContaining({
                    body,
                    headers: expect.objectContaining({
                        'twitch-eventsub-message-type': 'notification',
                        'twitch-eventsub-subscription-type': 'channel.channel_points_custom_reward_redemption.add'
                    })
                }),
                expect.any(Object)
            );
        });

        it('should handle bits transaction', async () => {
            const body = {
                subscription: {
                    type: 'extension.bits_transaction.create'
                },
                event: {
                    bits: 100,
                    user_name: 'test_user'
                }
            };

            const response = await createTwitchWebhookRequest(
                'notification',
                body,
                { subscriptionType: 'extension.bits_transaction.create' }
            );

            expect(response.status).toBe(200);
            expect(twitchWebhookService.handleBitsTransactionCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    body,
                    headers: expect.objectContaining({
                        'twitch-eventsub-message-type': 'notification',
                        'twitch-eventsub-subscription-type': 'extension.bits_transaction.create'
                    })
                }),
                expect.any(Object)
            );
        });

        it('should handle unknown subscription type', async () => {
            const body = {
                subscription: {
                    type: 'unknown.type'
                }
            };

            const response = await createTwitchWebhookRequest(
                'notification',
                body,
                { subscriptionType: 'unknown.type' }
            );

            expect(response.status).toBe(403);
            expect(response.text).toBe('Unknown subscription type');
            expect(twitchWebhookService.handleChannelPointRedemption).not.toHaveBeenCalled();
            expect(twitchWebhookService.handleBitsTransactionCreate).not.toHaveBeenCalled();
        });
    });
});
