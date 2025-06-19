const Streamer = require('@models/streamer');

module.exports = {
    createStreamer: async (overrides = {}) => {
        const defaultStreamer = {
            twitchProfile: {
                id: '67890',
                displayName: 'Testicles',
            },
            itemsEnabled: true
        };

        return await Streamer.create({
            ...defaultStreamer,
            ...overrides,
            twitchProfile: {
                ...defaultStreamer.twitchProfile,
                ...(overrides.twitchProfile || {})
            }
        });
    }
}
