const Streamer = require("../models/streamer")
const jwt = require("jsonwebtoken")

module.exports = {
    post: async (req, res, next) => {
        const { token } = req.body;

        if (!token) {
            const error = new Error("Token is required");
            error.status = 400;
            return next(error);
        }

        let streamerToken
        try {
            const secret = Buffer.from(process.env.TWITCH_CLIENT_SECRET, 'base64');
            streamerToken = jwt.verify(token, secret);
        } catch (e) {
            console.log("ERROR:", e);
            const error = new Error("Invalid Access Token");
            error.status = 400;
            return next(error);
        }
        
        const { user_id, user_name } = streamerToken

        if (!user_id) {
            const error = new Error("Invalid User");
            error.status = 400;
            return next(error);
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
