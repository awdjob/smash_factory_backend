const MasterItem = require('../../models/masterItem');

module.exports = {
    createMasterItems: async () => {
        return await MasterItem.create([
            { 
                itemId: 5,
                name: 'Heart',
                enabled: true,
                defaultPrice: 1
            },
            { 
                itemId: 15,
                name: 'Beam Sword',
                enabled: true,
                defaultPrice: 2
            },
            { 
                itemId: 53,
                name: 'Golden Gun',
                enabled: false,
                defaultPrice: 3
            },
            { 
                itemId: 10,
                name: 'Poke Ball',
                enabled: true,
                defaultPrice: 1
            },
            { 
                itemId: 12,
                name: 'Green Shell',
                enabled: false,
                defaultPrice: 2
            }
        ]);
    }
}
