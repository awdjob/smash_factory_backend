const Streamer = require('@models/streamer');
const jwt = require('jsonwebtoken');
const twitchStreamerService = require('@services/twitchStreamerService');

module.exports = {
    post: async (req, res) => {
        const { token, displayName } = req.body;

        if (!token) {
            return res.status(400).json({ message: "JWT is required" });
        }

        if (!displayName) {
            return res.status(400).json({ message: "Display name is required" });
        }

        const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
        let streamerToken;
        try {
            streamerToken = jwt.verify(token, secret);
        } catch (e) {
            return res.status(400).json({ message: "Invalid JWT" });
        }

        const { user_id } = streamerToken;

        if (!user_id) {
            return res.status(400).json({ message: "Invalid User" });
        }

        const streamer = await Streamer.findOne({ "twitchProfile.id": user_id });

        if (streamer) {
            return res.status(200).json({ message: "Streamer already exists" });
        }

        await twitchStreamerService.createStreamerWithDefaultItems({ id: user_id, displayName });

        return res.status(200).json({ message: "Streamer created" });
    }
};
