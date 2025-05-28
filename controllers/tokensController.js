const Token = require("../models/token")
const { getCurrentViewer } = require("../middlewares/viewerAuth")
const { broadcastEvent } = require("../services/eventService")
const Streamer = require("../models/streamer")
const StreamerItem = require("../models/streamerItem")

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
        const tokens = await Token.find({ _id: { $in: tokenIds }, redeemedAt: null })
        const item = await StreamerItem.findOne({
            masterItemId: itemId,
            streamerId: streamerId,
            enabled: true
        })
        const streamer = await Streamer.findOne({ "twitchProfile.id": streamerId })

        if (tokens.length < item.price) {
            return res.status(400).json({ error: `Not enough tokens. You need ${item.price} tokens to spawn ${item.name}` })
        }

        if (!item) {
            return res.status(400).json({ error: 'Item not found' })
        }

        if (!streamer) {
            return res.status(400).json({ error: 'Streamer not found' })
        }

        await Token.updateMany({
            _id: { $in: tokenIds }
        }, {
            $set: {
                redeemedAt: new Date(),
                redeemedFor: item.masterItemId
            }
        })

        broadcastEvent(streamer.channelId, {
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