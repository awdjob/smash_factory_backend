const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authMiddleware = require('./middlewares/auth');
const { getCurrentViewer } = require('./middlewares/viewerAuth');
const { getCurrentStreamer } = require('./middlewares/streamerAuth');
const errorHandler = require('./middlewares/errorHandler');
const tokensController = require('./controllers/tokensController');
const twitchWebhookController = require('./controllers/twitchWebhookController');
const twitchChatTokenService = require('./services/twitchChatTokenService');
const itemsController = require('./controllers/itemsController');
const signupController = require('./controllers/signupController');
const signinController = require('./controllers/signinController');
const streamersController = require('./controllers/streamersController');
const eventsController = require('./controllers/eventsController');
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(authMiddleware);

app.get('/tokens', tokensController.get);
app.post('/tokens/redeem', tokensController.redeem);
app.put('/streamers', streamersController.put);

app.get('/events', eventsController.get);
app.get('/bot/auth', twitchChatTokenService.handleOAuthCallback);
app.post('/webhook/twitch', twitchWebhookController.process);
app.get('/items', itemsController.get);
app.post('/signup', signupController.post);
app.get('/signin', signinController.get);

if (process.env.NODE_ENV === 'test') {
  app.get('/viewer_test', (req, res) => {
    const user = getCurrentViewer();
    res.json({
      user: user
    });
  });

  app.get('/streamer_test', (req, res) => {
    const streamer = getCurrentStreamer();
    res.json({
      streamer: streamer
    });
  });
}

// Error handling middleware should be last
app.use(errorHandler);

module.exports = app;