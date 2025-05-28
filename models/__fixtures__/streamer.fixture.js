const Streamer = require('@models/streamer');

module.exports = {
    createStreamer: async () => {
        return await Streamer.create({
            twitchProfile: {
                id: '67890',
                displayName: 'Testicles'
            }
        });
    }
}
