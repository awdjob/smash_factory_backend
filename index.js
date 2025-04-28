require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Store for connected SSE clients
const clients = new Map();

// SSE endpoint for real-time updates
app.get('/events', (req, res) => {
  const clientId = Date.now();
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ message: 'Connected to event stream' })}\n\n`);
  
  // Add client to connected clients
  clients.set(clientId, res);
  
  // Remove client on connection close
  req.on('close', () => {
    clients.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  });
  
  console.log(`Client ${clientId} connected to event stream`);
});

// Function to broadcast event to all connected clients
function broadcastEvent(eventData) {
  clients.forEach(client => {
    client.write(`data: ${JSON.stringify(eventData)}\n\n`);
  });
}

// Simple health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

// Twitch webhook verification endpoint (GET)
app.get('/webhook/twitch', (req, res) => {
  // Handle Twitch webhook verification challenge
  const challenge = req.query['hub.challenge'];
  const mode = req.query['hub.mode'];
  const topic = req.query['hub.topic'];
  
  console.log(`Received Twitch webhook verification: ${mode} for ${topic}`);
  
  // Return the challenge to confirm subscription
  if (challenge) {
    return res.status(200).send(challenge);
  }
  
  res.status(400).send('Bad Request');
});

// Twitch webhook notification endpoint (POST)
app.post('/webhook/twitch', (req, res) => {
  // Verify webhook signature if TWITCH_WEBHOOK_SECRET is set
  if (process.env.TWITCH_WEBHOOK_SECRET) {
    const signature = req.headers['twitch-eventsub-message-signature'];
    const messageId = req.headers['twitch-eventsub-message-id'];
    const timestamp = req.headers['twitch-eventsub-message-timestamp'];
    const body = JSON.stringify(req.body);
    
    const hmacMessage = messageId + timestamp + body;
    const hmac = 'sha256=' + crypto
      .createHmac('sha256', process.env.TWITCH_WEBHOOK_SECRET)
      .update(hmacMessage)
      .digest('hex');
    
    if (hmac !== signature) {
      console.log('Webhook signature verification failed');
      return res.status(403).send('Forbidden');
    }
  }
  
  // Process the webhook notification
  console.log('Received Twitch webhook notification:', req.body);
  
  // Broadcast the event to all connected clients via SSE
  broadcastEvent({
    type: 'twitch_event',
    data: req.body
  });
  
  // Acknowledge receipt of the notification
  res.status(200).send('OK');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
