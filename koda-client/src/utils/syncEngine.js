import { getOfflineQueue, markOfflineQueueAsSynced } from './offlineStorage.js';

const SERVER_URL = "http://Localhost:5000/api/activities/offline_sync";
let isSyncing = false;

export async function syncOfflineActivities() {
    if (isSyncing) return; // Prevent multiple syncs at the same time
   
    const queue = await getOfflineQueue();
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
            await clearOfflineQueue(); // Mark as not synced if server response is not ok
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
        syncOfflineActivitivies();
    });

    setInterval(() => {
        if (navigator.onLine) {
            syncOfflineActivities();
        }
    }, 60000); // Check every 60 seconds
}