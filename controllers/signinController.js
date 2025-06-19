const Streamer = require("@models/streamer")
const jwt = require("jsonwebtoken")
const twitchStreamerService = require("@services/twitchStreamerService")

module.exports = {
    get: async (req, res) => {
        const { code } = req.query
        const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_REDIRECT_URI, JWT_SECRET } = process.env

        if (code) {
            let oauthRes
            try {
                oauthRes = await fetch("https://id.twitch.tv/oauth2/token", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        code,
                        client_id: TWITCH_CLIENT_ID,
                        client_secret: TWITCH_CLIENT_SECRET,
                        grant_type: "authorization_code",
                        redirect_uri: TWITCH_REDIRECT_URI
                    })
                });

                if (!oauthRes.ok) {
                    throw new Error(`HTTP error! status: ${oauthRes.status}`);
                }

                const { access_token } = await oauthRes.json();

                const userInfo = await twitchStreamerService.getUserInfo(access_token)

                let streamer = await Streamer.findOne({ "twitchProfile.id": userInfo.id })

                if (!streamer) {
                    streamer = await twitchStreamerService.createStreamerWithDefaultItems({ id: userInfo.id, displayName: userInfo.display_name })
                }

                if (!streamer.channelPointRewardCreated) {

                    try {
                        const reward = await twitchStreamerService.createCustomReward(access_token, userInfo.id)
                        await twitchStreamerService.createSubscription(access_token, 'channel.points_custom_reward_redemption.add', userInfo.id, { reward_id: reward.id })

                        streamer.channelPointRewardCreated = true
                        await streamer.save()
                    } catch (e) {
                        if (!e.message.includes("DUPLICATE_REWARD")) {
                            throw e
                        }
                    }
                }

                const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now

                const token = jwt.sign({
                    displayName: streamer.twitchProfile.displayName,
                    streamerId: streamer._id,
                }, JWT_SECRET, { expiresIn: expiresAt })

                const redirectUrl = `smash-factory://callback?token=${encodeURIComponent(token)}&expires_at=${expiresAt}`;
                res.redirect(redirectUrl);
            } catch (e) {
                console.log(`Error during signin process: ${e.message}`)
                // Redirect with error for custom protocol
                const errorUrl = `smash-factory://callback?error=${encodeURIComponent("Error during signin process")}`;
                res.redirect(errorUrl);
                return
            }

        } else {
            // Redirect with error for custom protocol
            const errorUrl = `smash-factory://callback?error=${encodeURIComponent("Malformed OAuth Request")}`;
            res.redirect(errorUrl);
        }
    },
}