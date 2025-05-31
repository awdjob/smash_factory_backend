require('dotenv').config();
require('module-alias/register');
const app = require("./server");
const mongoose = require("mongoose");
const Viewer = require("./models/viewer");
const Streamer = require("./models/streamer");
const Token = require("./models/token");
const tmi = require("tmi.js");
const { broadcastEvent } = require("./services/eventService");
const tokenService = require("./services/twitchChatTokenService");
const StreamerItem = require("./models/streamerItem");
const MasterItem = require("./models/masterItem");
const itemService = require("./services/itemService");

const PORT = process.env.PORT || 5000;
const { DB_URL } = process.env

async function startServer() {
    try {
        await mongoose.connect(DB_URL);
        console.log('Connected to MongoDB');

        await tokenService.initialize();

        app.listen(PORT);
        console.log(`Server listening on port ${PORT}`);

        const client = await initializeTwitchClient();

        client.connect().catch(console.error);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

const initializeTwitchClient = async () => {
    const accessToken = await tokenService.getValidAccessToken();

    const client = new tmi.Client({
        options: { debug: true },
        identity: {
            username: 'SmashFactoryBot',
            password: `oauth:${accessToken}`
        },
        channels: ['awdjob']
    });

    const streamer = await Streamer.findOne({ "twitchProfile.id": "754383611" });

    client.on('disconnected', async (reason) => {
        // if (reason.includes('authentication failed')) {
        //     console.log('Token expired, refreshing and reconnecting...');
        //     const newToken = await tokenService.refreshAccessToken();
        //     client.opts.identity.password = `oauth:${newToken}`;
        //     client.connect().catch(console.error);
        // }
    });

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
                let tokens = await Token.countDocuments({ viewerId: viewer.twitchProfile.id, streamerId: streamer.twitchProfile.id, redeemedAt: null })

                return client.say(channel, `@${tags.username}, you have ${tokens} tokens! Use channel points to buy more, or use !sf {itemId} {xCoord} to spawn an item. use !sf items to get a list of all items.`)
            case '!sf items':
                const smashItems = await itemService.getEnabledItemsForStreamer(streamer.twitchProfile.id);
                const header = "Name:ID:Tokens";
                const rows = smashItems.map(item => `${item.name}:${item.itemId}:${item.price}`);
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

                    const smashItem = await StreamerItem.findOne({
                        streamerId: streamer.twitchProfile.id,
                        enabled: true,
                        masterItemId: itemId
                    })
                    const masterItem = await MasterItem.findOne({
                        itemId: itemId
                    })
                    if (!smashItem) {
                        return client.say(channel, `@${tags.username}, invalid item ID.`);
                    }

                    const tokensToRedeem = await Token.find({
                        viewerId: viewer.twitchProfile.id,
                        streamerId: streamer.twitchProfile.id,
                        redeemedAt: null
                    }).limit(smashItem.price);

                    if (tokensToRedeem.length < smashItem.price) {
                        return client.say(channel, `@${tags.username}, you need ${smashItem.price} tokens to spawn ${masterItem.name}, but you only have ${tokensToRedeem.length}.`);
                    }

                    const tokenIdsToRedeem = tokensToRedeem.map(token => token._id);
                    await Token.updateMany({
                        _id: {
                            $in: tokenIdsToRedeem
                        }
                    }, { $set: { redeemedAt: new Date(), redeemedFor: smashItem.masterItemId } });

                    broadcastEvent(streamer.channelId, {
                        type: 'spawn_item',
                        data: {
                            itemId,
                            coords: {
                                x: xCoord,
                            }
                        }
                    });

                    return client.say(channel, `@${tags.username}, spawning ${masterItem.name} (ID: ${smashItem.masterItemId}) at X: ${xCoord}! (${smashItem.price} tokens deducted)`);
                }

                // If not a recognized pattern, show help
                return client.say(channel, `@${tags.username}, invalid command. use !sf tokens to get your token count, or !sf items to get a list of all items.`);
        }
    });

    return client;
};

startServer().catch(console.error);