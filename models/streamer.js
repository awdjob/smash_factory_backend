const mongoose = require('mongoose');
const crypto = require('crypto');

const twitchProfileSchema = mongoose.Schema({
  id: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
})

const streamerSchema = new mongoose.Schema({
  twitchProfile: {
    type: twitchProfileSchema,
    required: true
  },
  itemsEnabled: {
    type: Boolean,
    default: false,
  },
  channelId: {
    type: String,
    unique: true,
    required: true,
    default: () => crypto.randomBytes(32).toString('hex')
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Streamer', streamerSchema);
