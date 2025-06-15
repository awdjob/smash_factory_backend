require("dotenv").config();
const mongoose = require('mongoose');
const Token = require('./models/token');
const Streamer = require('./models/streamer');
const Viewer = require('./models/viewer');

// Get command line arguments
const args = process.argv.slice(2); // Remove node and file path
const streamerName = args[0];
const viewerName = args[1];
const tokenAmount = parseInt(args[2], 10);

if (!streamerName || !viewerName || isNaN(tokenAmount)) {
    console.error('Usage: node giftTokens.js <streamerName> <viewerName> <tokenAmount>');
    process.exit(1);
}

async function giftTokens() {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log('Connected to database');

        const streamer = await Streamer.findOne({
            "twitchProfile.displayName": { $regex: new RegExp(`^${streamerName}$`, 'i') }
        });
        if (!streamer) {
            console.error(`Streamer "${streamerName}" not found`);
            process.exit(1);
        }

        const viewer = await Viewer.findOne({
            "twitchProfile.displayName": { $regex: new RegExp(`^${viewerName}$`, 'i') }
        });
        if (!viewer) {
            console.error(`Viewer "${viewerName}" not found`);
            process.exit(1);
        }

        console.log(`Found streamer: ${streamer.twitchProfile.displayName}`);
        console.log(`Found viewer: ${viewer.twitchProfile.displayName}`);
        console.log(`Creating ${tokenAmount} tokens...`);

        const tokens = await Promise.all(Array.from({ length: tokenAmount }).map(async () => {
            const token = new Token({
                viewerId: viewer._id,
                streamerId: streamer._id,
                platform: "twitch",
                source: "gifted",
                sourceEventId: "manual-gifted-tokens",
            });

            return token.save();
        }));

        console.log(`Successfully created ${tokens.length} tokens`);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from database');
    }
}

giftTokens();