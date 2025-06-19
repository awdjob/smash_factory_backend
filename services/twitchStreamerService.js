const itemService = require('@services/itemService');
const Streamer = require('@models/streamer');

/**
 * Service for handling Twitch streamer operations
 */
class TwitchStreamerService {
    /**
     * Exchanges an OAuth code for an access token
     * @internal
     * @param {string} code - The authorization code from Twitch OAuth
     * @returns {Promise<{access_token: string, refresh_token: string, scope: string}>} The token response
     */
    async exchangeCodeForToken(code) {
        const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.TWITCH_SIGNUP_REDIRECT_URI
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to exchange code for token: ${error.message || 'Unknown error'}`);
        }

        return response.json();
    }

    /**
     * Gets user information from Twitch API
     * @internal
     * @param {string} accessToken - The user's access token
     * @returns {Promise<{id: string, display_name: string}>} The user information
     */
    async getUserInfo(accessToken) {
        if (!accessToken) {
            throw new Error('Access token is required');
        }

        const response = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Client-Id': process.env.TWITCH_CLIENT_ID
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to get user info: ${error.message || 'Unknown error'}`);
        }

        const { data: [user] } = await response.json();
        if (!user) {
            throw new Error('No user data returned from Twitch');
        }

        return user;
    }

    /**
     * Creates an EventSub subscription
     * @internal
     * @param {string} appAccessToken - The app access token
     * @param {string} type - The subscription type
     * @param {string} broadcasterId - The broadcaster's Twitch ID
     * @param {Object} [condition] - Optional additional conditions for the subscription
     * @returns {Promise<Object>} The subscription response
     */
    async createSubscription(appAccessToken, type, broadcasterId, condition = {}) {
        const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appAccessToken}`,
                'Client-Id': process.env.TWITCH_CLIENT_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type,
                version: '1',
                condition: {
                    broadcaster_user_id: broadcasterId,
                    ...condition
                },
                transport: {
                    method: 'webhook',
                    callback: process.env.TWITCH_SIGNUP_REDIRECT_URI,
                    secret: process.env.TWITCH_WEBHOOK_SECRET
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to create ${type} subscription: ${error.message || 'Unknown error'}`);
        }

        return response.json();
    }

    /**
     * Creates a custom channel point reward for the streamer
     * @internal
     * @param {string} accessToken - The streamer's access token
     * @param {string} broadcasterId - The streamer's Twitch ID
     * @returns {Promise<{id: string, title: string}>} The created reward
     */
    async createCustomReward(accessToken, broadcasterId) {
        const response = await fetch(`https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcasterId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Client-Id': process.env.TWITCH_CLIENT_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: '100 Smash Factory Tokens',
                cost: 1000,
                prompt: 'Redeem to get 100 Smash Factory Tokens!',
                is_enabled: true,
                background_color: '#9146FF',
                is_user_input_required: false,
                should_redemptions_skip_request_queue: true
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to create custom reward: ${error.message || 'Unknown error'}`);
        }

        const { data: [reward] } = await response.json();
        return {
            id: reward.id,
            title: reward.title
        };
    }

    /**
     * Handles the OAuth signup process
     * @public
     * @param {string} code - The authorization code from Twitch OAuth
     * @returns {Promise<{user: Object, tokens: Object}>} The user info and tokens
     */
    async handleOAuthSignup(code) {
        try {
            const { access_token, refresh_token, expires_in } = await this.exchangeCodeForToken(code);
            const user = await this.getUserInfo(access_token);

            // Create the custom reward
            const reward = await this.createCustomReward(access_token, user.id);

            return {
                user,
                accessToken: access_token,
                refreshToken: refresh_token,
                tokenExpiresAt: Date.now() + (expires_in * 1000), // Convert seconds to milliseconds
                reward
            };
        } catch (error) {
            console.error('Error in OAuth signup process:', error);
            throw error;
        }
    }

    /**
     * Creates new Streamer record, creates default items for new Streamer, adds custom twitch redemption reward
     * and creates EventSub subscription for the streamer's channel point redemption we just created
     * @returns {Streamer} The created streamer
     */
    async createStreamerWithDefaultItems(twitchProfile) {
        const streamer = await Streamer.create({ twitchProfile })

        if (!streamer) {
            throw new Error('Failed to create streamer');
        }

        await itemService.createDefaultStreamerItems(streamer._id)

        return streamer;
    }
}

module.exports = new TwitchStreamerService();