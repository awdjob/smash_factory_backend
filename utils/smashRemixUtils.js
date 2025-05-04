module.exports = {
    getItemFromRewardTitle: (rewardTitle) => {
        const items = [
            { name: 'Smash Factory Heart', id: 5, tier: 3 }, // 100 cps
            { name: 'Smash Factory Tomato', id: 4, tier: 2 }, // 50 cps
            { name: 'Smash Factory Star', id: 6, tier: 2 }, // 20 cps
            { name: 'Smash Factory Beam Sword', id: 7, tier: 2 }, // 10 cps
            { name: 'Smash Factory Bat', id: 8, tier: 2 }, // 10 cps
            { name: 'Smash Factory Fan', id: 9, tier: 1 }, // 5 cps
            { name: 'Smash Factory Wand', id: 10, tier: 2 }, // 30 cps
            { name: 'Smash Factory Ray Gun', id: 11, tier: 2 }, // 10 cps
            { name: 'Smash Factory Fire Flower', id: 12, tier: 1 }, // 5 cps
            { name: 'Smash Factory Hammer', id: 13, tier: 3 }, // 200 cps
            { name: 'Smash Factory Motion Sensor Bomb', id: 14, tier: 2 }, // 20 cps
            { name: 'Smash Factory Bob-omb', id: 15, tier: 2 }, // 30 cps
            { name: 'Smash Factory Bumper', id: 16, tier: 1 }, // 5 cps
            { name: 'Smash Factory Green Shell', id: 17, tier: 1 }, // 10 cps
            { name: 'Smash Factory Red Shell', id: 18, tier: 1 }, // 20 cps
            { name: 'Smash Factory Live Onyx', id: 32, tier: 2 }, // 100 cps
            { name: 'Smash Factory Live Snorlax', id: 33, tier: 3 }, // 100 cps
            { name: 'Smash Factory Blue Shell', id: 48, tier: 3 }, // 100 cps
            { name: 'Smash Factory Franklin Badge', id: 51, tier: 2 }, // 100 cps
            { name: 'Smash Factory Golden Gun', id: 53, tier: 2 } // 50 cps
        ];

        return items.find(item => item.name === rewardTitle);
    }
}
