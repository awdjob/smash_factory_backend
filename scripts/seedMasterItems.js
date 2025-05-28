const mongoose = require('mongoose');
const MasterItem = require('../models/masterItem');
require('dotenv').config();

const ITEMS = {
	'Heart': { id: 5, cost: 3 },
	'Fazoli\'s': { id: 4, cost: 2 },
	'Star': { id: 6, cost: 2 },
	'Beam Sword': { id: 7, cost: 2 },
	'Bat': { id: 8, cost: 2 },
	'Fan': { id: 9, cost: 1 },
	'Wand': { id: 10, cost: 2 },
	'Ray Gun': { id: 11, cost: 2 },
	'Fire Flower': { id: 12, cost: 1 },
	'Hammer': { id: 13, cost: 3 },
	'Motion Sensor Bomb': { id: 14, cost: 2 },
	'Bob-omb': { id: 15, cost: 2 },
	'Bumper': { id: 16, cost: 1 },
	'Green Shell': { id: 17, cost: 1 },
	'Red Shell': { id: 18, cost: 2 },
	'Live Onyx': { id: 32, cost: 2 },
	'Live Snorlax': { id: 33, cost: 3 },
	'Blue Shell': { id: 48, cost: 3 },
	'Franklin Badge': { id: 51, cost: 2 },
	'Golden Gun': { id: 53, cost: 3 }
};

async function seedMasterItems() {
	try {
		// Connect to MongoDB
		await mongoose.connect(process.env.DB_URL);
		console.log('Connected to MongoDB');

		// Convert ITEMS object to array of MasterItem documents
		const masterItems = Object.entries(ITEMS).map(([name, { id }]) => ({
			itemId: id,
			name,
			enabled: true
		}));

		// Delete existing master items
		await MasterItem.deleteMany({});
		console.log('Deleted existing master items');

		// Insert new master items
		const result = await MasterItem.insertMany(masterItems);
		console.log(`Successfully created ${result.length} master items`);

		// Log the created items
		console.log('\nCreated items:');
		result.forEach(item => {
			console.log(`${item.name} (ID: ${item.itemId})`);
		});

	} catch (error) {
		console.error('Error seeding master items:', error);
	} finally {
		// Close the database connection
		await mongoose.connection.close();
		console.log('\nDatabase connection closed');
	}
}

// Run the seed function
seedMasterItems(); 