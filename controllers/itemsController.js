const MasterItem = require('@models/masterItem');
const itemService = require('@services/itemService');
const Streamer = require("@models/streamer")

module.exports = {
    get: async (req, res) => {
        const { streamerId } = req.query;

        const streamer = await Streamer.findOne({ "twitchProfile.id": streamerId });

        const enabledItems = await itemService.getEnabledItemsForStreamer(streamer._id);

        res.status(200).json(enabledItems);
    },
    put: async (req, res) => {
    }
}