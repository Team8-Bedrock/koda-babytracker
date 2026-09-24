import { getQueuedActivities, markActivityAsSynced } from './offlineStorage';
import { API_URL } from '../config';

const SERVER_URL = `${API_URL}/api/offline_sync`;
let isSyncing = false;

export async function syncOfflineActivities() {
    if (isSyncing) return; // Prevent multiple syncs at the same time
   
    const queue = await getQueuedActivities();
    if (queue.length === 0) return; // No activities to sync

    isSyncing = true;
    console.log('Starting offline sync for activities:', queue);

    try {
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(queue),
        });

        if (response.ok) {
            await markActivityAsSynced();
            console.log ("[Sync Engine] Synchronication complete. Local cache cleared safely");
        } else {
            console.warn("[Sync Engine] Server responded with an error during offline sync:", response.statusText);
        }
    } catch (error) {
        console.error("[Sync Engine] Error during offline sync:", error);
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