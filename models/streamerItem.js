const mongoose = require('mongoose');

const streamerItemSchema = new mongoose.Schema({
    masterItemId: {
        type: Number,
        required: true
    },
    streamerId: {
        type: String,
        required: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    price: {
        type: Number,
        required: true
    }
}, {
    timestamps: true,
});

const StreamerItem = mongoose.model('StreamerItem', streamerItemSchema);

module.exports = StreamerItem; 