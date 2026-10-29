const mockStore = {
    getItem: jest.fn(),
    setItem: jest.fn(),
};

jest.mock('localforage', () => ({
    createInstance: jest.fn(() => mockStore),
}));

const { markActivityAsSynced } = require('../offlineStorage');

describe('offline activity storage', () => {
    beforeEach(() => {
        mockStore.getItem.mockReset();
        mockStore.setItem.mockReset();
    });

    it('removes only server-confirmed activities and preserves the rest', async () => {
        const queue = [
            { id: 'saved', isSynced: false },
            { id: 'failed', isSynced: false },
            { id: 'pending-review', isSynced: false },
        ];
        mockStore.getItem.mockResolvedValue(queue);

        await markActivityAsSynced(['saved', 'unknown-id']);

        expect(mockStore.setItem).toHaveBeenCalledWith('activityQueue', [
            { id: 'failed', isSynced: false },
            { id: 'pending-review', isSynced: false },
        ]);
    });

    it('does not modify the queue when no activities were confirmed', async () => {
        const queue = [{ id: 'still-pending', isSynced: false }];
        mockStore.getItem.mockResolvedValue(queue);

        await markActivityAsSynced([]);

        expect(mockStore.setItem).not.toHaveBeenCalled();
    });
});
