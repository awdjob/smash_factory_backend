const { AsyncLocalStorage } = require("node:async_hooks")

const streamerAuthStorage = new AsyncLocalStorage()

const streamerAuth = async (req, _, next) => {
    const user = streamerAuthStorage.getStore()
    if (user) {
        next()
    }
}

module.exports = { streamerAuth, streamerAuthStorage }