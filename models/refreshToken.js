const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    botName: {
        type: String,
        required: true,
        unique: true,
        default: 'smashfactorybot'
    },
    refreshToken: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

refreshTokenSchema.statics.getRefreshToken = async function() {
    const token = await this.findOne({ botName: 'smashfactorybot' });
    return token?.refreshToken;
};

refreshTokenSchema.statics.updateRefreshToken = async function(refreshToken) {
    const result = await this.findOneAndUpdate(
        { botName: 'smashfactorybot' },
        { 
            refreshToken: refreshToken,
            updatedAt: new Date()
        },
        { 
            upsert: true,
            new: true
        }
    );
    return result;
};

refreshTokenSchema.statics.deleteRefreshToken = async function() {
    await this.deleteOne({ botName: 'smashfactorybot' });
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken; 