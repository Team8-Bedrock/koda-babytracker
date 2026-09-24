// TEST
// npm install localforage
import localforage from 'localforage';

const activityStore = localforage.createInstance({
    name: 'KodayBabyTracker',
    storeName: 'cachedActivities',
});

export async function queueActivityOffline(type, data) {
    const pendingActivity = {
        id: crypto.randomUUID(),
        type: type,
        data: data,
        timestamp: new Date().toISOString(),
        isSynced: false,
    };

    try {
        const currentQue = (await activityStore.getItem('activityQueue')) || [];
        currentQue.push(pendingActivity);
        await activityStore.setItem('activityQueue', currentQue);
        console.log('Activity queued offline:', pendingActivity);
        return pendingActivity;
    } catch (error) {
        console.error('Error queuing activity offline:', error);
        throw error;
    }
}

export async function getQueuedActivities() {
    return (await activityStore.getItem('activityQueue')) || [];
}

export async function markActivityAsSynced() {
    await activityStore.setItem('activityQueue', []);
}