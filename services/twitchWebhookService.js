const Token = require('../models/token');

module.exports = {
  handleChannelPointRedemption: async (req, res) => {
    try {
      const event = req.body.event;
      const rewardTitle = event.reward.title;
      const userId = event.user_id;
      const streamerId = event.broadcaster_user_id;

      if (rewardTitle !== "Smash Factory Token") {
        return res.status(400).send('Invalid reward title');
      }

      const existingToken = await Token.findOne({
        viewerId: userId,
        streamerId,
        platform: "twitch",
        source: "channel_points",
        sourceEventId: event.id,
      });

      if (existingToken) {
        return res.status(200).json();
      }

      await Token.create({
        viewerId: userId,
        streamerId,
        platform: "twitch",
        source: "channel_points",
        sourceEventId: event.id,
      });

      return res.status(200).json();
    } catch (err) {
      console.error('Error handling channel point redemption:', err);
      return res.status(500).send('Internal server error');
    }
  },
  handleBitsTransactionCreate: async (req, res) => {
    try {
      const event = req.body.event;
      const userId = event.user_id;
      const streamerId = event.broadcaster_user_id;

      if (event.product.name !== "Smash Factory Token") {
        return res.status(400).send('Invalid reward title');
      }

      const existingToken = await Token.findOne({
        viewerId: userId,
        streamerId,
        platform: "twitch",
        source: "bits",
        sourceEventId: event.id,
      });

      if (existingToken) {
        return res.status(200).json();
      }

      await Token.create({  
        viewerId: userId,
        streamerId,
        platform: "twitch",
        source: "bits",
        sourceEventId: event.id,
      });

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


