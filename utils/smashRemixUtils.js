const items = [
    { name: 'Heart', id: 5, tier: 3 },
    { name: 'Tomato', id: 4, tier: 2 },
    { name: 'Star', id: 6, tier: 2 },
    { name: 'Beam Sword', id: 7, tier: 2 },
    { name: 'Bat', id: 8, tier: 2 },
    { name: 'Fan', id: 9, tier: 1 },
    { name: 'Wand', id: 10, tier: 2 },
    { name: 'Ray Gun', id: 11, tier: 2 },
    { name: 'Fire Flower', id: 12, tier: 1 },
    { name: 'Hammer', id: 13, tier: 3 },
    { name: 'Motion Sensor Bomb', id: 14, tier: 2 },
    { name: 'Bob-omb', id: 15, tier: 2 },
    { name: 'Bumper', id: 16, tier: 1 },
    { name: 'Green Shell', id: 17, tier: 1 },
    { name: 'Red Shell', id: 18, tier: 1 },
    { name: 'Live Onix', id: 32, tier: 2 },
    { name: 'Live Snorlax', id: 33, tier: 3 },
    { name: 'Blue Shell', id: 48, tier: 3 },
    { name: 'Franklin Badge', id: 51, tier: 2 }, 
    { name: 'Golden Gun', id: 53, tier: 2 } 
];

module.exports = {
    getItemFromRewardTitle: (rewardTitle) => {
        return items.find(item => item.name === rewardTitle);
    },
    smashItems: items
}
