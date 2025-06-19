const { getCurrentStreamer } = require('@middlewares/streamerAuth');

module.exports = {
    put: async (req, res) => {
        const { itemsEnabled } = req.body;
        if (!itemsEnabled) {
            res.status(400).json({ message: "itemsEnabled is required" });
            return;
        }

        const streamer = getCurrentStreamer();

        try {
            streamer.itemsEnabled = itemsEnabled;
            await streamer.save();
        } catch (e) {
            res.status(400).json({ message: e.message });
        }

        res.status(200).json();
    }
}