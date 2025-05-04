const auth = require('../auth');
const { viewerAuth } = require('../viewerAuth');
const { streamerAuth } = require('../streamerAuth');

// Mock the dependencies
jest.mock('../viewerAuth');
jest.mock('../streamerAuth');

describe('Auth Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Setup mock request, response and next function
        mockReq = {
            get: jest.fn(),
            path: ''
        };
        mockRes = {};
        mockNext = jest.fn();
    });

    describe('Extension Authentication', () => {
        it('should call viewerAuth when X-Auth-Source is extension', async () => {
            mockReq.get.mockReturnValue('extension');
            
            await auth(mockReq, mockRes, mockNext);
            
            expect(viewerAuth).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('Client Authentication', () => {
        it('should call streamerAuth when X-Auth-Source is client', async () => {
            mockReq.get.mockReturnValue('client');
            
            await auth(mockReq, mockRes, mockNext);
            
            expect(streamerAuth).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('Public Routes', () => {
        it('should allow access to /auth routes without authentication', async () => {
            mockReq.path = '/auth';
            
            await auth(mockReq, mockRes, mockNext);
            
            expect(viewerAuth).not.toHaveBeenCalled();
            expect(streamerAuth).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should allow access to /webhook/twitch routes without authentication', async () => {
            mockReq.path = '/webhook/twitch';
            
            await auth(mockReq, mockRes, mockNext);
            
            expect(viewerAuth).not.toHaveBeenCalled();
            expect(streamerAuth).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith();
        });
    });

    describe('Invalid Auth Source', () => {
        it('should return 400 error for invalid auth source', async () => {
            mockReq.get.mockReturnValue('invalid');
            mockReq.path = '/api/some-endpoint';
            
            await auth(mockReq, mockRes, mockNext);
            
            expect(viewerAuth).not.toHaveBeenCalled();
            expect(streamerAuth).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Invalid Auth Source',
                status: 400
            }));
        });
    });
});
