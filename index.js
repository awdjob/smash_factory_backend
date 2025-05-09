require('dotenv').config();
const app = require("./server");
const mongoose = require("mongoose");
const Viewer = require("./models/viewer");
const Streamer = require("./models/streamer");
const Token = require("./models/token");
const tmi = require("tmi.js");
const { smashItems } = require("./utils/smashRemixUtils");
const { broadcastEvent } = require("./services/eventService");

const PORT = process.env.PORT || 5000;
const { DB_URL } = process.env

mongoose.connect(DB_URL).then(async () => {
    app.listen(PORT)
    console.log(`Server listening on port ${PORT}`)

    const client = new tmi.Client({
        options: { debug: true },
        identity: {
            username: 'AwdJob',
            password: `oauth:${process.env.TWITCH_BOT_OAUTH_ACCESS}`
        },
        channels: ['awdjob']
    });

    const streamer = await Streamer.findOne({ "twitchProfile.id": "754383611" })

    client.connect().catch(console.error);
    client.on('message', async (channel, tags, message, self) => {
        if (self) return;

        let viewer;
        if (message.toLowerCase().startsWith("!sf")) {
            viewer = await Viewer.findOne({ "twitchProfile.id": tags['user-id'] })
            if (!viewer) {
                viewer = await Viewer.create({
                    twitchProfile: {
                        id: tags['user-id'],
                        displayName: tags.username
                    }
                })
            }
        } else {
            return
        }

        switch (message.toLowerCase()) {
            case '!sf tokens':
                let tokens = await Token.countDocuments({ viewerId: viewer.twitchProfile.id, streamerId: streamer.twitchProfile.id })

                return client.say(channel, `@${tags.username}, you have ${tokens} tokens! Use channel points to buy more, or use !sf {itemId} {xCoord} to spawn an item. use !sf items to get a list of all items.`)
            case '!sf items':
                const header = "Name:ID:Tokens";
                const rows = smashItems.map(item => `${item.name}:${item.id}:${item.tier}`);
                const itemMessage = [header, ...rows].join(" | ");
                const fullMessage = `@${tags.username}, items: ${itemMessage}`;

                // Twitch chat message limit is 500 characters
                if (fullMessage.length <= 500) {
                    client.say(channel, fullMessage);
                } else {
                    // If too long, split into multiple messages (optional)
                    let current = `@${tags.username}, items: `;
                    for (const row of [header, ...rows]) {
                        if ((current + row + " | ").length > 500) {
                            client.say(channel, current);
                            current = "";
                        }
                        current += (current ? " | " : "") + row;
                    }
                    if (current) client.say(channel, current);
                }

                break;
            case '!sf':
                return client.say(
                    channel,
                    `@${tags.username}, Smash Factory is an interactive Twitch extension that lets you use tokens to spawn items in the current round of Super Smash! Use "!sf tokens" to check your token balance, "!sf items" to see all available items, and "!sf {itemId} {xCoord}" to spawn an item at a specific X position. Use Channel Points to buy more tokens!`
                );
            default:
                // Pattern: !sf {itemId} {xCoord}
                // Example: !sf 5 100
                const match = message.match(/^!sf\s+(\d+)\s+(-?\d+)$/i);
                if (match) {
                    const itemId = parseInt(match[1], 10);
                    const xCoord = parseInt(match[2], 10);

                    // Find the item by id
                    const item = smashItems.find(item => item.id === itemId);
                    if (!item) {
                        return client.say(channel, `@${tags.username}, invalid item ID.`);
                    }

                    const userTokens = await Token.countDocuments({ viewerId: viewer.twitchProfile.id, streamerId: streamer.twitchProfile.id });
                    if (userTokens < item.tier) {
                        return client.say(channel, `@${tags.username}, you need ${item.tier} tokens to spawn ${item.name}, but you only have ${userTokens}.`);
                    }

                    const tokensToRemove = await Token.find({ viewerId: viewer.twitchProfile.id, streamerId: streamer.twitchProfile.id }).limit(item.tier);
                    const tokenIdsToRemove = tokensToRemove.map(token => token._id);
                    await Token.deleteMany({ _id: { $in: tokenIdsToRemove } });

                    broadcastEvent(streamer.channelId, {
                        type: 'spawn_item',
                        data: {
                            itemId,
                            coords: {
                                x: xCoord,
                            }
                        }
                    });

                    return client.say(channel, `@${tags.username}, spawning ${item.name} (ID: ${item.id}) at X: ${xCoord}! (${item.tier} tokens deducted)`);
                }

                // If not a recognized pattern, show help
                return client.say(channel, `@${tags.username}, invalid command. use !sf tokens to get your token count, or !sf items to get a list of all items.`);
        }
    });
}).catch(e => {
    console.log("Mongoose Connection Error:", e)
})