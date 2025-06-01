const MasterItem = require('../models/masterItem');
const StreamerItem = require('../models/streamerItem');

class ItemService {
	/**
	 * Gets all enabled items for a specific streamer, including their custom prices
	 * @param {string} streamerId - The ID of the streamer
	 * @returns {Promise<Array>} Array of enabled items with streamer-specific pricing
	 */
	async getEnabledItemsForStreamer(streamerId) {
		const masterItems = await MasterItem.find({ enabled: true })
		const streamerItems = await StreamerItem.find({ streamerId })

		const items = masterItems.map(masterItem => {
			const streamerItem = streamerItems.find(item => item.masterItemId === masterItem.itemId)
			return {
				itemId: masterItem.itemId,
				name: masterItem.name,
				price: streamerItem ? streamerItem.price : masterItem.defaultPrice,
				enabled: streamerItem ? streamerItem.enabled : false
			}
		}).sort((a, b) => a.itemId - b.itemId)

		return items
	}

	async createDefaultStreamerItems(streamerId) {
		const enabledMasterItems = await MasterItem.find({ enabled: true })
			.select('itemId defaultPrice')
			.lean();

		const streamerItems = enabledMasterItems.map(masterItem => ({
			streamerId,
			masterItemId: masterItem.itemId,
			enabled: true,
			price: masterItem.defaultPrice,
			createdAt: new Date(),
			updatedAt: new Date()
		}));

		if (streamerItems.length > 0) {
			await StreamerItem.insertMany(streamerItems);
		}

		return streamerItems;
	}
}

module.exports = new ItemService(); 