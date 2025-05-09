const Token = require("../models/token")
const { getCurrentViewer } = require("../middlewares/viewerAuth")
const { broadcastEvent } = require("../services/eventService")
const Streamer = require("../models/streamer")


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
    redeem: async (req, res) => {
        const { tokenIds, itemId, streamerId, xCoord } = req.body
        const tokens = await Token.find({ _id: { $in: tokenIds } })

        const redeemedAt = new Date();

        // Update all tokens with redeemedAt timestamp
        await Promise.all(tokens.map(token => {
            token.redeemedAt = redeemedAt
            return token.save()
        }))
        
        
        const streamer = await Streamer.findOne({ "twitchProfile.id": streamerId })

        broadcastEvent(streamer.channelId,{
            type: 'spawn_item',
            data: {
                itemId,
                coords: {
                    x: xCoord,
                }
            }
        });

        res.status(200).json()
    }
}