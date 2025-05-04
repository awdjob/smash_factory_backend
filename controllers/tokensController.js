const Token = require("../models/token")
const { getCurrentViewer } = require("../middlewares/viewerAuth")


module.exports = {
    get: async (req, res) => {
        const currentViewer = getCurrentViewer()
        const { streamerId } = req.query

        if (!streamerId) {
            return res.status(400).json({ error: 'streamerId is required' })
        }

        const tokens = await Token.find({ 
            viewerId: currentViewer.twitchProfile.id,
            streamerId: streamerId,
            platform: "twitch",
            redeemedAt: null,
        })
        
        res.status(200).json(tokens)
    },
}