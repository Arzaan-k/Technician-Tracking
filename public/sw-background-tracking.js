// Background Geolocation Service Worker
// This service worker enables background location tracking even when the app is closed

const CACHE_NAME = 'technician-tracking-v1';
const LOCATION_BATCH_KEY = 'pending-locations';
const SYNC_TAG = 'location-sync';
const BACKGROUND_SYNC_INTERVAL = 30000; // 30 seconds

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing background tracking service worker');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json'
            ]).catch(err => {
                console.log('[SW] Cache add failed:', err);
            });
        })
    );
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating background tracking service worker');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    return self.clients.claim();
});

// Background Sync event - sync locations when connection is restored
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync event:', event.tag);

    if (event.tag === SYNC_TAG) {
        event.waitUntil(syncPendingLocations());
    }
});

// Periodic Background Sync (if supported)
self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic sync event:', event.tag);

    if (event.tag === 'location-update') {
        event.waitUntil(syncPendingLocations());
    }
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
    console.log('[SW] Received message:', event.data);

    if (event.data.type === 'START_BACKGROUND_TRACKING') {
        startBackgroundTracking(event.data.config);
    } else if (event.data.type === 'STOP_BACKGROUND_TRACKING') {
        stopBackgroundTracking();
    } else if (event.data.type === 'SYNC_NOW') {
        event.waitUntil(syncPendingLocations());
    } else if (event.data.type === 'GET_STATUS') {
        event.ports[0].postMessage({
            isTracking: self.isBackgroundTracking || false,
            pendingCount: self.pendingLocations?.length || 0
        });
    }
});

// Store location update
async function storeLocationUpdate(location) {
    try {
        const db = await openDatabase();
        const tx = db.transaction('locations', 'readwrite');
        const store = tx.objectStore('locations');

        await store.add({
            ...location,
            timestamp: Date.now(),
            synced: false
        });

        console.log('[SW] Location stored:', location);

        // Try to sync immediately if online
        if (navigator.onLine) {
            await syncPendingLocations();
        }
    } catch (error) {
        console.error('[SW] Failed to store location:', error);
    }
}

// Sync pending locations to server
async function syncPendingLocations() {
    try {
        const db = await openDatabase();
        const tx = db.transaction('locations', 'readonly');
        const store = tx.objectStore('locations');
        const index = store.index('synced');

        const unsynced = await index.getAll(false);

        if (unsynced.length === 0) {
            console.log('[SW] No pending locations to sync');
            return;
        }

        console.log(`[SW] Syncing ${unsynced.length} locations`);

        // Get auth token from IndexedDB
        const token = await getAuthToken();
        if (!token) {
            console.log('[SW] No auth token, skipping sync');
            return;
        }

        // Send to server
        const response = await fetch('/api/location/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                locations: unsynced.map(loc => ({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    accuracy: loc.accuracy,
                    speed: loc.speed,
                    heading: loc.heading,
                    timestamp: loc.timestamp,
                    batteryLevel: loc.batteryLevel,
                    networkStatus: loc.networkStatus
                }))
            })
        });

        if (response.ok) {
            // Mark as synced
            const writeTx = db.transaction('locations', 'readwrite');
            const writeStore = writeTx.objectStore('locations');

            for (const loc of unsynced) {
                await writeStore.delete(loc.id);
            }

            console.log('[SW] Successfully synced locations');

            // Notify all clients
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'LOCATIONS_SYNCED',
                    count: unsynced.length
                });
            });
        } else {
            console.error('[SW] Sync failed:', response.status);
        }
    } catch (error) {
        console.error('[SW] Sync error:', error);
    }
}

// Open IndexedDB
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('TechnicianTrackingDB', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('locations')) {
                const store = db.createObjectStore('locations', { keyPath: 'id', autoIncrement: true });
                store.createIndex('synced', 'synced', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }

            if (!db.objectStoreNames.contains('config')) {
                db.createObjectStore('config', { keyPath: 'key' });
            }
        };
    });
}

// Get auth token from IndexedDB
async function getAuthToken() {
    try {
        const db = await openDatabase();
        const tx = db.transaction('config', 'readonly');
        const store = tx.objectStore('config');
        const result = await store.get('authToken');
        return result?.value;
    } catch (error) {
        console.error('[SW] Failed to get auth token:', error);
        return null;
    }
}

// Background tracking using Geolocation API
let backgroundTrackingInterval = null;

async function startBackgroundTracking(config = {}) {
    console.log('[SW] Starting background tracking');

    self.isBackgroundTracking = true;

    // Store config
    const db = await openDatabase();
    const tx = db.transaction('config', 'readwrite');
    const store = tx.objectStore('config');
    await store.put({ key: 'trackingConfig', value: config });

    // Request persistent storage
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log('[SW] Persistent storage:', isPersisted);
    }

    // Start periodic location updates
    if (!backgroundTrackingInterval) {
        backgroundTrackingInterval = setInterval(async () => {
            try {
                // Note: Service Workers can't directly access Geolocation API
                // We need to communicate with the main app
                const clients = await self.clients.matchAll();
                if (clients.length > 0) {
                    clients[0].postMessage({ type: 'REQUEST_LOCATION' });
                }
            } catch (error) {
                console.error('[SW] Background tracking error:', error);
            }
        }, config.interval || BACKGROUND_SYNC_INTERVAL);
    }

    // Register for periodic background sync (if supported)
    if ('periodicSync' in self.registration) {
        try {
            await self.registration.periodicSync.register('location-update', {
                minInterval: 30 * 60 * 1000 // 30 minutes
            });
            console.log('[SW] Periodic sync registered');
        } catch (error) {
            console.log('[SW] Periodic sync not available:', error);
        }
    }
}

function stopBackgroundTracking() {
    console.log('[SW] Stopping background tracking');

    self.isBackgroundTracking = false;

    if (backgroundTrackingInterval) {
        clearInterval(backgroundTrackingInterval);
        backgroundTrackingInterval = null;
    }

    // Unregister periodic sync
    if ('periodicSync' in self.registration) {
        self.registration.periodicSync.unregister('location-update')
            .catch(err => console.log('[SW] Failed to unregister periodic sync:', err));
    }
}

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

console.log('[SW] Background tracking service worker loaded');
