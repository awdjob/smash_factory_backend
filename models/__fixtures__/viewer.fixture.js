const Viewer = require('@models/viewer');

module.exports = {
    createViewer: async () => {
        return await Viewer.create({
            twitchProfile: {
                id: '12345',
                displayName: 'Testie'
            }
        });
    }
}