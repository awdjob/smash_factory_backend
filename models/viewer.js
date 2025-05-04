const mongoose = require("mongoose")

const twitchProfileSchema = mongoose.Schema({
    id: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
})

const viewerSchema = mongoose.Schema({
    twitchProfile: {
        type: twitchProfileSchema,
        required: true
    }
})

const viewerModel = mongoose.model("Viewer", viewerSchema)
module.exports = viewerModel