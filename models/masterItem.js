const mongoose = require('mongoose');

const masterItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    itemId: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

const MasterItem = mongoose.model('MasterItem', masterItemSchema);

module.exports = MasterItem; 