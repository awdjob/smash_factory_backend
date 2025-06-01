const Streamer = require("../models/streamer")
const jwt = require("jsonwebtoken")

module.exports = {
    post: async (req, res) => {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Token is required" });
        }

        let streamerToken
        try {
            const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
            streamerToken = jwt.verify(token, secret);
        } catch (e) {
            return res.status(400).json({ message: "Invalid Access Token" });
        }
        
        const { user_id, user_name } = streamerToken

        if (!user_id) {
            return res.status(400).json({ message: "Invalid User" });
        }

        let streamer = await Streamer.findOne({ "twitchProfile.id": user_id })
        if (streamer) {
            return res.status(400).json({ message: "Streamer already exists" });
        }

        streamer = await Streamer.create({
            twitchProfile: { id: user_id, displayName: user_name }
        })

        res.status(200).json();
    }
};
