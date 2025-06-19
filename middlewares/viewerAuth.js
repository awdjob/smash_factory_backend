const { AsyncLocalStorage } = require("node:async_hooks")
const jwt = require("jsonwebtoken")
const User = require("../models/viewer")

const viewerAuthStorage = new AsyncLocalStorage()

module.exports = {
    viewerAuthStorage,
    viewerAuth: async (req, _, next) => {
        const rawToken = req.get("Authorization").split("Bearer ")[1]

        let viewerToken
        try {
            const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET, 'base64');
            viewerToken = jwt.verify(rawToken, secret);
        } catch (e) {
            const error = new Error("Invalid Access Token");
            error.status = 400;
            return next(error);
        }

        const { user_id, user_name } = viewerToken

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
                    displayName: user_name
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