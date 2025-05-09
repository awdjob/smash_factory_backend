const mongoose = require("mongoose")

const twitchProfileSchema = mongoose.Schema({
    id: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    displayName: {
        type: String,
        required: true
    }
})

const viewerSchema = mongoose.Schema({
    twitchProfile: {
        type: twitchProfileSchema,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const viewerModel = mongoose.model("Viewer", viewerSchema)
module.exports = viewerModel