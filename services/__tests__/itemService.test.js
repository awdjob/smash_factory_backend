const mongoose = require('mongoose');
const itemService = require('@services/itemService');
const MasterItem = require('@models/masterItem');
const StreamerItem = require('@models/streamerItem');
const { dbConnect, dbDisconnect } = require('@root/mongoTestConfig');

const { createStreamer } = require('@models/__fixtures__/streamer.fixture');
const { createMasterItems } = require('@models/__fixtures__/masterItem.fixture');
const { createStreamerItems } = require('@models/__fixtures__/streamerItem.fixture');

let streamer;
let masterItems;
let streamerItems;

beforeEach(async () => {
    await dbConnect();
    streamer = await createStreamer();
    masterItems = await createMasterItems();
    streamerItems = await createStreamerItems(streamer._id, masterItems);
});

afterEach(async () => {
    await dbDisconnect();
});

describe('ItemService', () => {
    describe('getEnabledItemsForStreamer', () => {
        it('return items when streamer has all the master items', async () => {
            const items = await itemService.getEnabledItemsForStreamer(streamer._id);
            const expectedItems = [
                { itemId: 5, name: 'Heart', price: 3, enabled: true },
                { itemId: 15, name: 'Beam Sword', price: 4, enabled: false },
                { itemId: 10, name: 'Poke Ball', price: 6, enabled: false }
            ]

            expect(items).toEqual(expect.arrayContaining(expectedItems));
            expect(expectedItems).toEqual(expect.arrayContaining(items));
        });

        it('return items when streamer has some of the master items', async () => {
            // should return all the streamer items and the master items with the master items default price but as disabled for the streamer

            await StreamerItem.deleteOne({ streamerId: streamer._id, masterItemId: 53 });
            await MasterItem.updateOne({ itemId: 53 }, { enabled: true });

            const items = await itemService.getEnabledItemsForStreamer(streamer._id);
            const expectedItems = [
                { itemId: 5, name: 'Heart', price: 3, enabled: true },
                { itemId: 10, name: 'Poke Ball', price: 6, enabled: false },
                { itemId: 15, name: 'Beam Sword', price: 4, enabled: false },
                { itemId: 53, name: 'Golden Gun', price: 3, enabled: false }
            ]

            expect(items).toEqual(expect.arrayContaining(expectedItems));
            expect(expectedItems).toEqual(expect.arrayContaining(items));
        })

        it('should not return disabled master items', async () => {
            const disabledMasterItems = await MasterItem.find({ enabled: false });

            const items = await itemService.getEnabledItemsForStreamer(streamer._id);

            const itemsIds = items.map(item => item.itemId);
            disabledMasterItems.forEach(item => {
                expect(itemsIds).not.toContain(item.itemId);
            });
        });
    });

    describe('createDefaultStreamerItems', () => {
        it('should create streamer items for all enabled master items', async () => {
            await StreamerItem.deleteMany({ streamerId: streamer._id });
            const createdItems = await itemService.createDefaultStreamerItems(streamer._id);

            masterItems.filter(item => item.enabled).forEach(item => {
                const createdItem = createdItems.find(createdItem => createdItem.masterItemId === item.itemId);
                expect(createdItem).toBeDefined();
                expect(createdItem.price).toEqual(item.defaultPrice);
                expect(createdItem.enabled).toEqual(true);
            });
        });

        it('should handle case when no enabled master items exist', async () => {
            await MasterItem.updateMany({}, { enabled: false });
            await StreamerItem.deleteMany({ streamerId: streamer._id });

            const createdItems = await itemService.createDefaultStreamerItems(streamer._id);

            expect(createdItems).toHaveLength(0);
            const dbItems = await StreamerItem.find({ streamerId: streamer._id });
            expect(dbItems).toHaveLength(0);
        });
    });
});
