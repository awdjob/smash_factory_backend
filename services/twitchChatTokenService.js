const axios = require('axios');
const RefreshToken = require('../models/refreshToken');
require('dotenv').config();

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes buffer before expiry
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

class TokenService {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.refreshPromise = null;
        this.retryCount = 0;
        this.retryTimeout = null;
        this.refreshTimeout = null;
    }

    async initialize() {
        try {
            const tokenData = await RefreshToken.getRefreshToken();
            if (!tokenData) {
                throw new Error('No refresh token found. Please complete the OAuth flow first.');
            }

            await this.refreshAccessToken();
            console.log('Token service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize token service:', error.message);
            throw error;
        }
    }

    handleOAuthCallback = async (req, res) => {
        const { code, error, error_description } = req.query;

        // Handle errors from Twitch
        if (error) {
            console.error(`OAuth error: ${error} - ${error_description}`);
            return res.status(400).send(`Authentication error: ${error_description}`);
        }

        // Check if code is present
        if (!code) {
            return res.status(400).send('Authorization code missing');
        }

        try {
            // Exchange the code for tokens
            const response = await axios.post(TWITCH_TOKEN_URL, null, {
                params: {
                    client_id: process.env.TWITCH_CLIENT_ID,
                    client_secret: process.env.TWITCH_CLIENT_SECRET,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: process.env.TWITCH_REDIRECT_URI
                }
            });

            const { access_token, refresh_token, expires_in } = response.data;

            // Verify this is the smashfactorybot account
            const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Client-Id': process.env.TWITCH_CLIENT_ID
                }
            });

            const user = userResponse.data.data[0];
            if (user.login.toLowerCase() !== 'smashfactorybot') {
                return res.status(403).send('Unauthorized: Only smashfactorybot can be used for this application');
            }

            // Store the refresh token
            await RefreshToken.updateRefreshToken(refresh_token);

            // Set up the access token
            this.accessToken = access_token;
            this.tokenExpiry = Date.now() + (expires_in * 1000);
            this._scheduleNextRefresh(expires_in);

            res.send('Bot authorized successfully');
        } catch (error) {
            console.error('Error in OAuth callback:', error.message);
            if (error.message.includes('Unauthorized')) {
                res.status(403).send(error.message);
            } else {
                res.status(500).send('Error obtaining Twitch token');
            }
        }
    }

    async refreshAccessToken() {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = this._doRefreshAccessToken();
        try {
            const result = await this.refreshPromise;
            this.retryCount = 0;
            return result;
        } finally {
            this.refreshPromise = null;
        }
    }

    async _doRefreshAccessToken() {
        try {
            const refreshToken = await RefreshToken.getRefreshToken();
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await axios.post(TWITCH_TOKEN_URL, null, {
                params: {
                    client_id: process.env.TWITCH_CLIENT_ID,
                    client_secret: process.env.TWITCH_CLIENT_SECRET,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                }
            });

            const { access_token, refresh_token, expires_in } = response.data;

            // Update token state
            this.accessToken = access_token;
            this.tokenExpiry = Date.now() + (expires_in * 1000);

            // If we got a new refresh token, update it
            if (refresh_token && refresh_token !== refreshToken) {
                await RefreshToken.updateRefreshToken(refresh_token);
            }

            // Schedule next refresh
            this._scheduleNextRefresh(expires_in);

            console.log(`Token refreshed successfully. Next refresh in ${expires_in} seconds`);
            return access_token;
        } catch (error) {
            console.error('Error refreshing Twitch token:', error.message);
            
            if (error.response) {
                switch (error.response.status) {
                    case 401:
                        if (error.response.data?.message?.includes('refresh token')) {
                            console.error('Refresh token is invalid or expired. Please reauthorize the bot.');
                            try {
                                await RefreshToken.deleteRefreshToken();
                            } catch (e) {
                                console.error('Error cleaning up refresh token:', e.message);
                            }
                            throw new Error('Refresh token is invalid or expired. Please complete the OAuth flow again.');
                        }
                        throw new Error('Invalid client credentials. Check your client ID and secret.');
                    case 429:
                        await this._handleRateLimit();
                        return this.refreshAccessToken();
                    default:
                        throw error;
                }
            }

            if (this.retryCount < MAX_RETRY_ATTEMPTS) {
                this.retryCount++;
                const delay = INITIAL_RETRY_DELAY * Math.pow(2, this.retryCount - 1);
                console.log(`Retrying token refresh in ${delay}ms (attempt ${this.retryCount}/${MAX_RETRY_ATTEMPTS})`);
                
                await new Promise(resolve => {
                    this.retryTimeout = setTimeout(resolve, delay);
                });
                
                return this.refreshAccessToken();
            }

            throw new Error('Max retry attempts reached for token refresh');
        }
    }

    async _handleRateLimit() {
        const retryAfter = parseInt(this.retryTimeout?.headers?.['retry-after'] || '60', 10);
        console.log(`Rate limited. Waiting ${retryAfter} seconds before retry.`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    }

    async getValidAccessToken() {
        // If token is expired or about to expire, refresh it
        if (!this.accessToken || !this.tokenExpiry || Date.now() > (this.tokenExpiry - TOKEN_EXPIRY_BUFFER)) {
            await this.refreshAccessToken();
        }
        return this.accessToken;
    }

    _scheduleNextRefresh(expiresIn) {
        // Clear any existing refresh timeout
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        // Schedule refresh slightly before token expires
        const refreshDelay = (expiresIn * 1000) - TOKEN_EXPIRY_BUFFER;
        this.refreshTimeout = setTimeout(async () => {
            try {
                await this.refreshAccessToken();
            } catch (error) {
                console.error('Scheduled token refresh failed:', error.message);
            }
        }, refreshDelay);

        console.log(`Next token refresh scheduled in ${refreshDelay / 1000} seconds`);
    }
}

module.exports = new TokenService(); 