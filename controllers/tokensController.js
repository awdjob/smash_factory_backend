const Token = require("@models/token")
const { getCurrentViewer } = require("@root/middlewares/viewerAuth")
const { broadcastEvent, clients } = require("@services/eventService")
const Streamer = require("@models/streamer")
const StreamerItem = require("@models/streamerItem")
const MasterItem = require("@models/masterItem")

module.exports = {
    get: async (req, res) => {
        const currentViewer = getCurrentViewer()
        const { streamerId } = req.query

        if (!streamerId) {
            return res.status(400).json({ error: 'streamerId is required' })
        }

        const streamer = await Streamer.findOne({ "twitchProfile.id": streamerId })
        if (!streamer) {
            return res.status(400).json({ error: 'Streamer not found' })
        }

        const tokens = await Token.find({
            viewerId: currentViewer._id,
            streamerId: streamer._id,
            platform: "twitch",
            redeemedAt: null,
        })

        res.status(200).json(tokens)
    },
    redeem: async (req, res) => {
        const currentViewer = getCurrentViewer()
        const { tokenIds, itemId, streamerId, xCoord } = req.body
        const tokens = await Token.find({ _id: { $in: tokenIds }, viewerId: currentViewer._id, redeemedAt: null })
        const streamer = await Streamer.findOne({ "twitchProfile.id": streamerId })

        if (!streamer) {
            return res.status(400).json({ error: 'Streamer not found' })
        }

        if (!clients.has(streamer.channelId)) {
            return res.status(400).json({ error: 'Streamer is not connected to Smash Factory client' })
        }

        const item = await StreamerItem.findOne({
            masterItemId: itemId,
            streamerId: streamer._id,
            enabled: true
        })

        if (!item) {
            return res.status(400).json({ error: 'Item not found' })
        }

        const masterItem = await MasterItem.findOne({ itemId })        

        if (!streamer.itemsEnabled) {
            return res.status(400).json({ error: 'Items are currently disabled for this streamer' })
        }

        if (tokens.length < item.price) {
            return res.status(400).json({ error: `Not enough tokens. You need ${item.price} tokens to spawn ${masterItem.name}` })
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
                itemName: masterItem.name,
                viewerDisplayName: currentViewer.twitchProfile.displayName,
                coords: {
                    x: xCoord,
                }
            }
        });

        res.status(200).json()
    }
}