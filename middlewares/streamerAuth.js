const { AsyncLocalStorage } = require("node:async_hooks")
const jwt = require("jsonwebtoken")
const Streamer = require("../models/streamer")

const streamerAuthStorage = new AsyncLocalStorage()

module.exports = {
    streamerAuthStorage,
    streamerAuth: async (req, _, next) => {
        const rawToken = req.get("Authorization").split("Bearer ")[1]

        let streamerToken
        try {
            streamerToken = jwt.verify(rawToken, process.env.JWT_SECRET);
        } catch (e) {
            const error = new Error("Invalid Access Token");
            error.status = 401;
            return next(error);
        }

        const { streamerId } = streamerToken

        if (!streamerId) {
            const error = new Error("Invalid Streamer Token")
            error.status = 401
            return next(error)
        }

        const streamer = await Streamer.findById(streamerId)
        if (!streamer) {
            const error = new Error("Streamer Not Found")
            error.status = 404
            return next(error)
        }

        streamerAuthStorage.enterWith(streamer)
        next()
    },
    getCurrentStreamer: () => {
        return streamerAuthStorage.getStore()
    }
}