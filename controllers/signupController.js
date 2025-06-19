const Streamer = require('@models/streamer');
const jwt = require('jsonwebtoken');
const twitchStreamerService = require('@services/twitchStreamerService');

module.exports = {
    post: async (req, res) => {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: "JWT is required" });
        }

        const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
        let streamerToken;
        try {
            streamerToken = jwt.verify(token, secret);
        } catch (e) {
            return res.status(400).json({ message: "Invalid JWT" });
        }

        const { user_id, user_name } = streamerToken;

        if (!user_id || !user_name) {
            return res.status(400).json({ message: "Invalid User" });
        }

        const streamer = await Streamer.findOne({ "twitchProfile.id": user_id });

        if (streamer) {
            return res.status(200).json({ message: "Streamer already exists" });
        }

        await twitchStreamerService.createStreamer({ id: user_id, displayName: user_name });

        return res.status(200).json({ message: "Streamer created" });
    }
};
