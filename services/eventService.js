const clients = new Map();

function broadcastEvent(channelId, eventData) {
    const client = clients.get(channelId);
    if (!client) {
        throw new Error(`No clients found for channel ${channelId}`);
    }
    client.write(`data: ${JSON.stringify(eventData)}\n\n`);
}

function addClient(channelId, client) {
    clients.set(channelId, client);
}

function removeClient(channelId) {
    clients.delete(channelId);
}

module.exports = { broadcastEvent, addClient, removeClient, clients };


