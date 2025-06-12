const Streamer = require('../models/streamer');

module.exports = {
    put: async (req, res) => {
        const { streamerId } = req.query;
        const { itemsEnabled } = req.body;

        let streamer;
        try {
            streamer = await Streamer.findByIdAndUpdate({ "twitchProfile.id": streamerId }, { itemsEnabled }, { new: true });
        } catch (e) {
            res.status(400).json({ message: e.message });
        }

        res.status(200).json(streamer);
    }
}