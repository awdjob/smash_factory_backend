const { handleChannelPointRedemption, handleBitsTransactionCreate } = require("../services/twitchWebhookService")
const { createHmac } = require('crypto');

module.exports = {
    process: async (req, res) => {
        // Check if this is a verification request (EventSub sends challenge in body)
        if (req.body && req.body.challenge && req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification') {
            return res.status(200).send(req.body.challenge);
        }

        // For actual notifications, verify signature
        const signature = req.headers['twitch-eventsub-message-signature'];
        const messageId = req.headers['twitch-eventsub-message-id'];
        const timestamp = req.headers['twitch-eventsub-message-timestamp'];
        const body = JSON.stringify(req.body);

        // Only verify signature if we have a secret and this is a real notification
        if (process.env.TWITCH_WEBHOOK_SECRET &&
            signature && messageId && timestamp &&
            req.headers['twitch-eventsub-message-type'] === 'notification') {

            const hmacMessage = messageId + timestamp + body;
            const hmac = 'sha256=' + createHmac('sha256', process.env.TWITCH_WEBHOOK_SECRET)
                .update(hmacMessage)
                .digest('hex');

            if (hmac !== signature) {
                return res.status(403).send('Forbidden');
            }
        }

        switch (req.body.subscription?.type) {
            case 'channel.channel_points_custom_reward_redemption.add':
                handleChannelPointRedemption(req, res)
                break;
            case 'extension.bits_transaction.create':
                handleBitsTransactionCreate(req, res)
                break;
            default:
                return res.status(403).send('Unknown subscription type');
        }
    }
}
