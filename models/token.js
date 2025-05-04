const mongoose = require("mongoose")

const tokenSchema = mongoose.Schema({
    viewerId: {
        type: String,
        required: true,
    },
    streamerId: {
        type: String,
        required: true,
    },
    platform: {
        type: String,
        required: true,
    },
    source: {
        type: String,
        required: true,
    },
    sourceEventId: {
        type: String,
        required: true,
    },
    redeemedAt: {
        type: Date,
    },
})

const Token = mongoose.model("Token", tokenSchema)

module.exports = Token

