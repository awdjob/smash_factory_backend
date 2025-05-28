const StreamerItem = require('@models/streamerItem');

module.exports = {
    createStreamerItems: async (streamerId, masterItems) => {
        const streamerItems = masterItems.map((item, index) => ({
            streamerId: streamerId,
            masterItemId: item.itemId,
            price: 3 + index,
            enabled: index % 2 === 0,
        }));
        return await StreamerItem.create(streamerItems);
    }
}
