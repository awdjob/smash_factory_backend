const { broadcastEvent, addClient, removeClient, clients } = require('../eventService');

describe('eventService', () => {
  let mockClient;
  const channelId = 'test-channel';
  const testEventData = { type: 'test', data: 'test-data' };

  beforeEach(() => {
    mockClient = {
      write: jest.fn()
    };
    clients.clear();
  });

  describe('addClient', () => {
    it('should add a client to the channel', () => {
      addClient(channelId, mockClient);
      expect(clients.get(channelId)).toBe(mockClient);
    });
  });

  describe('broadcastEvent', () => {
    it('should write event data to the client', () => {
      addClient(channelId, mockClient);
      broadcastEvent(channelId, testEventData);
      expect(mockClient.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(testEventData)}\n\n`
      );
    });

    it('should throw error when channel has no clients', () => {
      expect(() => broadcastEvent('non-existent-channel', testEventData))
        .toThrow();
    });
  });

  describe('removeClient', () => {
    it('should remove client from the channel', () => {
      addClient(channelId, mockClient);
      expect(clients.has(channelId)).toBe(true);
      removeClient(channelId);
      expect(clients.has(channelId)).toBe(false);
    });

    it('should not throw when removing non-existent channel', () => {
      expect(() => removeClient('non-existent-channel')).not.toThrow();
    });
  });
}); 