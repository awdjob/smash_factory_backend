const axios = require('axios');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authMiddleware = require('./middlewares/auth');
const { getCurrentViewer } = require('./middlewares/viewerAuth');
const tokensController = require('./controllers/tokensController');
const twitchWebhookController = require('./controllers/twitchWebhookController');
const { broadcastEvent, addClient, removeClient } = require('./services/eventService');
const Streamer = require('./models/streamer');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(authMiddleware);

app.get('/tokens', tokensController.get);
app.post('/redeem', tokensController.redeem);

// SSE endpoint for real-time updates
app.get('/events', async (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const { streamerId } = req.query

  const streamer = await Streamer.findOne({ "twitchProfile.id": streamerId });

  const channelId = streamer.channelId;

  // Add client to connected clients
  addClient(channelId, res);

  // Send initial connection message
  broadcastEvent(channelId, { message: 'Connected to event stream' });

  // Remove client on connection close
  req.on('close', () => {
    removeClient(channelId);
    console.log(`Client ${channelId} disconnected`);
  });

  console.log(`Client ${channelId} connected to event stream`);
});

// Twitch OAuth completion endpoint
app.get('/auth', async (req, res) => {
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
    // Exchange the code for an access token
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TWITCH_REDIRECT_URI
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Log the tokens to console (for development purposes only)
    console.log('----------------- TWITCH AUTH SUCCESS -----------------');
    console.log('Access Token:', access_token);
    console.log('Refresh Token:', refresh_token);
    console.log('Expires In:', expires_in, 'seconds');
    console.log('------------------------------------------------------');
    res.send('ok');
  } catch (error) {
    console.error('Error exchanging code for token:', error.response?.data || error.message);
    res.status(500).send('Error obtaining Twitch token');
  }
});

// Twitch webhook notification endpoint (POST)
app.post('/webhook/twitch', twitchWebhookController.process);

if (process.env.NODE_ENV === 'test') {
    app.get('/viewer_test', (req, res) => {
        const user = getCurrentViewer();
        res.json({
            user: user
        });
    });
}

module.exports = app;