jest.mock('../offlineStorage', () => ({
    getQueuedActivities: jest.fn(),
    markActivityAsSynced: jest.fn(),
}));

jest.mock('../authStorage', () => ({
    getCurrentUserId: jest.fn(),
}));

import { getQueuedActivities, markActivityAsSynced } from '../offlineStorage';
import { getCurrentUserId } from '../authStorage';
import { syncOfflineActivities } from '../syncEngine';

const activity = (id, loggedBy) => ({
    id,
    type: 'feeding',
    data: { loggedBy, amount: 4 },
    timestamp: '2026-10-21T12:00:00.000Z',
    isSynced: false,
});

const setOnline = (online) => {
    Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: online,
    });
};

describe('offline activity sync', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setOnline(true);
        localStorage.setItem('token', 'test-token');
        getCurrentUserId.mockReturnValue('user-1');
        getQueuedActivities.mockResolvedValue([
            activity('user-1-entry-1', 'user-1'),
            activity('user-2-entry-1', 'user-2'),
            activity('user-1-entry-2', 'user-1'),
        ]);
        global.fetch = jest.fn();
    });

    it('sends only this user’s entries and removes only server-confirmed IDs', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                processedIds: ['user-1-entry-1', 'unknown-id'],
                errors: [{ id: 'user-1-entry-2', message: 'Temporary failure' }],
            }),
        });

        await syncOfflineActivities();

        const [url, request] = global.fetch.mock.calls[0];
        expect(url).toContain('/api/offline_sync');
        expect(request.headers['x-auth-token']).toBe('test-token');
        expect(JSON.parse(request.body).map((entry) => entry.id)).toEqual([
            'user-1-entry-1',
            'user-1-entry-2',
        ]);
        expect(markActivityAsSynced).toHaveBeenCalledWith(['user-1-entry-1']);
    });

    it('leaves queued activities untouched when the request fails', async () => {
        const logError = jest.spyOn(console, 'error').mockImplementation(() => {});
        global.fetch.mockResolvedValue({ ok: false, status: 503 });

        await syncOfflineActivities();

        expect(markActivityAsSynced).not.toHaveBeenCalled();
        expect(logError).toHaveBeenCalled();
        logError.mockRestore();
    });

    it('does not send queued activities while offline', async () => {
        setOnline(false);

        await syncOfflineActivities();

        expect(global.fetch).not.toHaveBeenCalled();
        expect(markActivityAsSynced).not.toHaveBeenCalled();
    });

    it('does not send queued activities without an authenticated user', async () => {
        getCurrentUserId.mockReturnValue(null);

        await syncOfflineActivities();

        expect(global.fetch).not.toHaveBeenCalled();
        expect(markActivityAsSynced).not.toHaveBeenCalled();
    });
});
