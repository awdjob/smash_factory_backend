const MasterItem = require('../models/masterItem');
const itemService = require('../services/itemService');

module.exports = {
    get: async (req, res) => {
        const { streamerId } = req.query;

        const enabledItems = await itemService.getEnabledItemsForStreamer(streamerId);

        res.status(200).json(enabledItems);
    },
    put: async (req, res) => {
    }
}