const MasterItem = require('../models/masterItem');
const StreamerItem = require('../models/streamerItem');

module.exports = {
    get: async (req, res) => {
        const { streamerId } = req.query;

        const enabledItems = await MasterItem.aggregate([
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

        res.status(200).json(enabledItems);
    },
    put: async (req, res) => {
    }
}