import { getQueuedActivities, markActivityAsSynced } from './offlineStorage';
import { API_URL } from '../config';
import { getCurrentUserId } from './authStorage';

const SERVER_URL = `${API_URL}/api/offline_sync`;
let isSyncing = false;

export async function syncOfflineActivities() {
    if (isSyncing || !navigator.onLine) return;

    const token = localStorage.getItem('token');
    const userId = getCurrentUserId();

    if (!token || !userId) return;

    isSyncing = true;

    try {
        const allActivities = await getQueuedActivities();

        // Sync only entries belonging to the logged-in user.
        const queue = allActivities.filter((activity) => {
            const loggedBy =
                activity.data?.loggedBy || activity.data?.userId;

            return String(loggedBy) === String(userId);
        });

        if (queue.length === 0) return;

        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token,
            },
            body: JSON.stringify(queue),
        });

        if (!response.ok) {
            throw new Error(
                `Offline sync failed: ${response.status}`
            );
        }

        const result = await response.json();

        const sentIds = new Set(queue.map((activity) => activity.id));

        const processedIds = Array.isArray(result.processedIds)
            ? result.processedIds.filter((id) => sentIds.has(id))
            : [];

        await markActivityAsSynced(processedIds);

        if (processedIds.length > 0) {
            window.dispatchEvent(new Event('offline-sync-complete'));
        }
        
    } catch (error) {
        console.error('[Sync Engine]', error);
    } finally {
        isSyncing = false;
    }
}

export function initializeSyncEngine() {
    window.addEventListener('online', () => {
        syncOfflineActivities();
    });

    setInterval(() => {
        if (navigator.onLine) {
            syncOfflineActivities();
        }
    }, 60000); // Check every 60 seconds
}