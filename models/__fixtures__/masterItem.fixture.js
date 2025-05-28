const MasterItem = require('../../models/masterItem');

module.exports = {
    createMasterItems: async () => {
        return await MasterItem.create([
            { 
                itemId: 5,
                name: 'Heart',
                enabled: true,
            },
            { 
                itemId: 15,
                name: 'Beam Sword',
                enabled: true,
            },
            { 
                itemId: 53,
                name: 'Golden Gun',
                enabled: false,
            },
            { 
                itemId: 10,
                name: 'Poke Ball',
                enabled: true,
            },
            { 
                itemId: 10,
                name: 'Green Shell',
                enabled: false,
            }
        ]);
    }
}
