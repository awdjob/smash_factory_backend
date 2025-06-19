/**
 * Sample Twitch OAuth responses for testing
 * Based on Twitch API documentation: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
 */

const mockTwitchOAuthResponse = {
    // Sample response from token endpoint
    tokenResponse: {
        access_token: 'rfx2uswqe8l4g1mkagrvg5tv0ks3',
        expires_in: 14124,
        refresh_token: '5b93chm6hdcey1t3efxyz',
        scope: ['channel:read:polls', 'channel:manage:polls'],
        token_type: 'bearer'
    },

    // Sample response from user info endpoint
    userInfoResponse: {
        id: '713936733',
        login: 'teststreamer',
        display_name: 'TestStreamer',
        type: '',
        broadcaster_type: 'partner',
        description: 'Just a test streamer account',
        profile_image_url: 'https://static-cdn.jtvnw.net/jtv_user_pictures/test-profile-image-300x300.png',
        offline_image_url: 'https://static-cdn.jtvnw.net/jtv_user_pictures/test-offline-image-1920x1080.png',
        view_count: 12345,
        email: 'test@example.com',
        created_at: '2020-01-01T00:00:00Z'
    },

    // Sample error responses
    errorResponses: {
        invalidCode: {
            status: 400,
            message: 'Invalid authorization code',
            error: 'Bad Request'
        },
        invalidClient: {
            status: 401,
            message: 'Invalid client',
            error: 'Unauthorized'
        },
        serverError: {
            status: 500,
            message: 'Internal Server Error',
            error: 'Server Error'
        }
    },

    // Sample request parameters
    requestParams: {
        code: 'gulfwdmys5lsm6qyz4ximz9q32l10',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/auth/callback'
    },

    // Sample authorization URL parameters
    authUrlParams: {
        client_id: 'test-client-id',
        redirect_uri: 'http://localhost:3000/auth/callback',
        response_type: 'code',
        scope: 'channel:read:polls channel:manage:polls',
        state: 'c3ab8aa609ea11e793ae92361f002671'
    }
};

module.exports = mockTwitchOAuthResponse; 