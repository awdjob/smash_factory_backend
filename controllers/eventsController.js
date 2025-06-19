const jwt = require('jsonwebtoken');
const Streamer = require('@models/streamer');
const { addClient, broadcastEvent, removeClient,clients } = require("@root/services/eventService")

module.exports = {
    get: async (req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        const { token } = req.query

        let verifiedToken;
        try {
            verifiedToken = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }

        const streamerId = verifiedToken.streamerId;

        const streamer = await Streamer.findOne({ _id: streamerId });
        if (!streamer) {
            res.status(401).json({ error: 'Invalid streamer' });
            return;
        }

        const channelId = streamer.channelId;

        addClient(channelId, res);
        console.log(`Client ${channelId} connected to event stream`);

        broadcastEvent(channelId, { message: 'Connected to event stream' });

        const heartbeatInterval = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 5000);

        req.on('close', () => {
            clearInterval(heartbeatInterval);
            removeClient(channelId);
            console.log(`Client ${channelId} disconnected`);
        });
    }
}