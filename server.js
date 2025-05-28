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
const tokenService = require('./services/twitchChatTokenService');
const itemsController = require('./controllers/itemsController');

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

  // Set up heartbeat
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 5000);

  // Remove client on connection close
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    removeClient(channelId);
    console.log(`Client ${channelId} disconnected`);
  });

  console.log(`Client ${channelId} connected to event stream`);
});

app.get('/auth', tokenService.handleOAuthCallback);
app.post('/webhook/twitch', twitchWebhookController.process);
app.get('/items', itemsController.get);

if (process.env.NODE_ENV === 'test') {
    app.get('/viewer_test', (req, res) => {
        const user = getCurrentViewer();
        res.json({
            user: user
        });
    });
}

module.exports = app;