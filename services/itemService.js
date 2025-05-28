const MasterItem = require('../models/masterItem');

class ItemService {
	/**
	 * Gets all enabled items for a specific streamer, including their custom prices
	 * @param {string} streamerId - The ID of the streamer
	 * @returns {Promise<Array>} Array of enabled items with streamer-specific pricing
	 */
	async getEnabledItemsForStreamer(streamerId) {
		return await MasterItem.aggregate([
			{ $match: { enabled: true } },
			{
				$lookup: {
					from: 'streameritems',
					let: { masterItemId: '$itemId' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$masterItemId', '$$masterItemId'] },
										{ $eq: ['$streamerId', streamerId] },
										{ $eq: ['$enabled', true] }
									]
								}
							}
						}
					],
					as: 'streamerItems'
				}
			},
			{
				$project: {
					_id: 0,
					itemId: 1,
					name: 1,
					price: { $ifNull: [{ $arrayElemAt: ['$streamerItems.price', 0] }, null] },
					enabled: { $ifNull: [{ $arrayElemAt: ['$streamerItems.enabled', 0] }, false] }
				}
			}
		]);
	}
}

module.exports = new ItemService(); 