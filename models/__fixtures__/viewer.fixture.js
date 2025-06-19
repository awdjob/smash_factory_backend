const Viewer = require('@models/viewer');

module.exports = {
    createViewer: async (options = {}) => {
        const viewer = {
            twitchProfile: {
                id: '12345',
                displayName: 'Testie'
            },
            ...options
        }

        return await Viewer.create(viewer);
    }
}