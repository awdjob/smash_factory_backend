const Token = require('../models/token');
const Viewer = require('../models/viewer');
const Streamer = require('../models/streamer');

module.exports = {
  handleChannelPointRedemption: async (req, res) => {
    try {
      const event = req.body.event;
      const rewardTitle = event.reward.title;
      const userId = event.user_id;
      const streamerId = event.broadcaster_user_id;

      // Extract the amount from the title (e.g., "5 Smash Factory Tokens")
      const match = rewardTitle.match(/^([0-9]+) Smash Factory Token(s)?/);
      const tokenAmount = match ? parseInt(match[1], 10) : null;

      if (!tokenAmount) {
        return res.status(400).send('Invalid reward title');
      }

      const viewer = await Viewer.findOne({ "twitchProfile.id": userId })
      const streamer = await Streamer.findOne({ "twitchProfile.id": streamerId })

      if (!viewer) {
        console.error(`Viewer not found for userId: ${userId}`);
        return res.status(400).json();
      }

      if (!streamer) {
        console.error(`Streamer not found for streamerId: ${streamerId}`);
        return res.status(400).json();
      }

      const existingTokens = await Token.countDocuments({
        viewerId: viewer._id,
        streamerId: streamer._id,
        platform: "twitch",
        source: "channel_points",
        sourceEventId: event.id,
      });

      if (existingTokens >= tokenAmount) {
        // Already have enough tokens for this event
        console.log(`Already have enough tokens for this event: ${existingTokens} >= ${tokenAmount}`);
        return res.status(200).json();
      }

      // Create only the missing tokens
      const tokensToCreate = tokenAmount - existingTokens;
      const tokens = Array.from({ length: tokensToCreate }).map(() => ({
        viewerId: viewer._id,
        streamerId: streamer._id,
        platform: "twitch",
        source: "channel_points",
        sourceEventId: event.id,
      }));

      await Token.insertMany(tokens);

      console.log(`Created ${tokensToCreate} tokens for event: ${event.id}`);

      return res.status(200).json();
    } catch (err) {
      console.error('Error handling channel point redemption:', err);
      return res.status(500).send('Internal server error');
    }
  },
  handleBitsTransactionCreate: async (req, res) => {
    const getTokenAmountFromSku = (sku) => {
      const match = sku.match(/(\d+)_tokens/);
      return match ? parseInt(match[1], 10) : 1;
    }

    try {
      const event = req.body.event;
      const userId = event.user_id;
      const streamerId = event.broadcaster_user_id;

      if (!event.product.sku.match(/(\d+)_tokens/)) {
        return res.status(400).send('Invalid reward title');
      }

      const viewer = await Viewer.findOne({ "twitchProfile.id": userId })
      const streamer = await Streamer.findOne({ "twitchProfile.id": streamerId })

      if (!viewer) {
        console.error(`Viewer not found for userId: ${userId}`);
        return res.status(400).json();
      }

      if (!streamer) {
        console.error(`Streamer not found for streamerId: ${streamerId}`);
        return res.status(400).json();
      }

      const tokenAmount = getTokenAmountFromSku(event.product.sku);

      const existingTokens = await Token.countDocuments({
        viewerId: viewer._id,
        streamerId: streamer._id,
        platform: "twitch",
        source: "bits",
        sourceEventId: event.id,
      });

      if (existingTokens >= tokenAmount) {
        // Already have enough tokens for this event
        return res.status(200).json();
      }

      // Create only the missing tokens
      const tokensToCreate = tokenAmount - existingTokens;
      const tokens = Array.from({ length: tokensToCreate }).map(() => ({
        viewerId: viewer._id,
        streamerId: streamer._id,
        platform: "twitch",
        source: "bits",
        sourceEventId: event.id,
      }));

      await Token.insertMany(tokens);

      return res.status(200).json();
    } catch (err) {
      console.error('Error handling bits transaction create:', err);
      return res.status(500).send('Internal server error');
    }
  }
}

// module.exports = {
//   channelPointRedemption: async (req, res) => {
//     // const event = req.body.event;
//     // const rewardTitle = event.reward.title;
//     // const userName = event.user_name;
//     // const userInput = event.user_input || '';

//     // const item = getItemFromRewardTitle(rewardTitle);

//     // if (!item) {
//     //     console.log(`No item found for reward title: ${rewardTitle}`);
//     //     return res.status(400).send('Invalid reward title');
//     // }

//     // // Parse X coordinate from user input
//     // let xCoord = 0;
//     // if (userInput) {
//     //     // Match positive or negative integers
//     //     const match = userInput.match(/-?\d+/);
//     //     if (match) {
//     //         xCoord = parseInt(match[0], 10);
//     //     }
//     // }

//     // // Broadcast the event to all connected game clients
//     // broadcastEvent({
//     //     type: 'spawn_item',
//     //     data: {
//     //         itemId: item.id,
//     //         coords: {
//     //             x: xCoord,
//     //         },
//     //         userName // Include who redeemed it for display purposes
//     //     }
//     // });

//     // console.log(`Broadcasting spawn for item ${item.id} at X=${xCoord} from ${userName}`);

//     // res.status(200).send();
// }


