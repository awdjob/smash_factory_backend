const { viewerAuth } = require("./viewerAuth")
const { streamerAuth } = require("./streamerAuth")

const WHITELISTED_PATHS = ["/auth", "/webhook/twitch", "/signup", "/signin", "/events"]

module.exports = async (req, _, next) => {
    if (req.get("X-Auth-Source") === "extension") {
        await viewerAuth(req, _, next)
    } else if (req.get("X-Auth-Source") === "client") {
        await streamerAuth(req, _, next)
    } else if (WHITELISTED_PATHS.includes(req.path)) {
        next()
    } else {
        const error = new Error("Invalid Auth Source")
        error.status = 400
        return next(error)
    }
}