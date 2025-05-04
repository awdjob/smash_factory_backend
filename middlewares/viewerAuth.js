const { AsyncLocalStorage } = require("node:async_hooks")
const jwt = require("jsonwebtoken")
const User = require("../models/viewer")

const viewerAuthStorage = new AsyncLocalStorage()

module.exports = {
    viewerAuthStorage,
    viewerAuth: async (req, _, next) => {
        const rawToken = req.get("Authorization").split("Bearer ")[1]

        const { TWITCH_EXTENSION_SECRET } = process.env
        let userToken
        try {
            const secret = Buffer.from(TWITCH_EXTENSION_SECRET, 'base64');
            userToken = jwt.verify(rawToken, secret);
        } catch (e) {
            const error = new Error("Invalid Access Token");
            error.status = 400;
            return next(error);
        }

        const { user_id } = userToken

        if (!user_id) {
            const error = new Error("Invalid User")
            error.status = 400
            return next(error)
        }

        const user = await User.findOne({ "twitchProfile.id": user_id })
        if (user) {
            viewerAuthStorage.enterWith(user)
            next()
        } else {
            const user = await User.create({
                twitchProfile: {
                    id: user_id,
                }
            })

            viewerAuthStorage.enterWith(user)
            next()
        }
    },
    getCurrentViewer: () => {
        return viewerAuthStorage.getStore()
    }
}