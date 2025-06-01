const { viewerAuth } = require("./viewerAuth")
const { streamerAuth } = require("./streamerAuth")

module.exports = async (req, _, next) => {
    if (req.get("X-Auth-Source") === "extension") {
        await viewerAuth(req, _, next)
    } else if (req.get("X-Auth-Source") === "client" || req.path.includes("/events")) {
        // await streamerAuth(req, _, next)
        next()
    } else if (req.path.includes("/auth") || req.path.includes("/webhook/twitch") || req.path.includes("/signup")) {
        next()
    } else {
        const error = new Error("Invalid Auth Source")
        error.status = 400
        return next(error)
    }
}