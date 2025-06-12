const Streamer = require('../models/streamer');

module.exports = {
    put: async (req, res) => {
        const { streamerId } = req.query;
        const { itemsEnabled } = req.body;

        let streamer;
        try {
            streamer = await Streamer.findByIdAndUpdate(streamerId, { itemsEnabled }, { new: true });
        } catch (e) {
            res.status(400).json({ message: 'Failed to update streamer' });
            console.error("ERROR UPDATING STREAMER:", e);
        }

        res.status(200).json(streamer);
    }
}