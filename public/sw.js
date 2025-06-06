// Service Worker for WASM optimization
const CACHE_NAME = 'gnark-did-wasm-v1.0.1';
const WASM_CACHE_NAME = 'gnark-did-wasm-files-v1.0.1';

// Files to cache immediately
const STATIC_CACHE_URLS = [
	'/wasm_exec.js',
	'/wasm-worker.js'
];

// WASM files to cache with special handling
const WASM_URLS = [
	'/crypto.wasm',
	'/did.wasm'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
	console.log('[SW] Installing service worker');

	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => {
				console.log('[SW] Caching static files');
				return cache.addAll(STATIC_CACHE_URLS);
			})
			.then(() => {
				console.log('[SW] Static files cached successfully');
				// Skip waiting to activate immediately
				return self.skipWaiting();
			})
			.catch((error) => {
				console.error('[SW] Failed to cache static files:', error);
			})
	);
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	console.log('[SW] Activating service worker');

	event.waitUntil(
		caches.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames.map((cacheName) => {
						// Delete old caches
						if (cacheName !== CACHE_NAME && cacheName !== WASM_CACHE_NAME) {
							console.log('[SW] Deleting old cache:', cacheName);
							return caches.delete(cacheName);
						}
					})
				);
			})
			.then(() => {
				console.log('[SW] Old caches cleaned up');
				// Take control of all pages immediately
				return self.clients.claim();
			})
			.catch((error) => {
				console.error('[SW] Failed to clean up caches:', error);
			})
	);
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Only handle same-origin requests
	if (url.origin !== self.location.origin) {
		return;
	}

	// Handle WASM files with special caching strategy
	if (url.pathname.endsWith('.wasm')) {
		event.respondWith(handleWasmRequest(event.request));
		return;
	}

	// Handle static files (wasm_exec.js, wasm-worker.js)
	if (STATIC_CACHE_URLS.includes(url.pathname)) {
		event.respondWith(handleStaticRequest(event.request));
		return;
	}

	// For other requests, use network first strategy
	event.respondWith(
		fetch(event.request)
			.catch(() => {
				// If network fails, try cache
				return caches.match(event.request);
			})
	);
});

// Handle WASM file requests with optimized caching
async function handleWasmRequest(request) {
	const url = new URL(request.url);
	const cacheName = WASM_CACHE_NAME;

	try {
		// Try cache first
		const cache = await caches.open(cacheName);
		const cachedResponse = await cache.match(request);

		if (cachedResponse) {
			// Check if cache is still valid (7 days)
			const cacheTime = cachedResponse.headers.get('x-cache-time');
			if (cacheTime) {
				const age = Date.now() - parseInt(cacheTime, 10);
				const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

				if (age < maxAge) {
					console.log(`[SW] Serving ${url.pathname} from cache (age: ${Math.round(age / 1000 / 60)} minutes)`);
					return cachedResponse;
				} else {
					console.log(`[SW] Cache expired for ${url.pathname}, fetching fresh copy`);
					// Delete expired cache entry
					await cache.delete(request);
				}
			} else {
				// No cache time header, serve from cache anyway
				console.log(`[SW] Serving ${url.pathname} from cache (no expiry info)`);
				return cachedResponse;
			}
		}

		// Fetch from network
		console.log(`[SW] Fetching ${url.pathname} from network`);
		const networkResponse = await fetch(request);

		if (networkResponse.ok) {
			// Clone response for caching
			const responseToCache = networkResponse.clone();

			// Add cache metadata
			const headers = new Headers(responseToCache.headers);
			headers.set('x-cache-time', Date.now().toString());
			headers.set('x-cached-by', 'service-worker');

			// Create new response with metadata
			const body = await responseToCache.arrayBuffer();
			const cachedResponse = new Response(body, {
				status: responseToCache.status,
				statusText: responseToCache.statusText,
				headers: headers
			});

			// Cache the response
			await cache.put(request, cachedResponse);
			console.log(`[SW] Cached ${url.pathname} successfully`);
		}

		return networkResponse;

	} catch (error) {
		console.error(`[SW] Error handling WASM request for ${url.pathname}:`, error);

		// Try to serve from cache as fallback
		const cache = await caches.open(cacheName);
		const fallbackResponse = await cache.match(request);

		if (fallbackResponse) {
			console.log(`[SW] Serving ${url.pathname} from cache as fallback`);
			return fallbackResponse;
		}

		// If all else fails, throw the error
		throw error;
	}
}

// Handle static file requests
async function handleStaticRequest(request) {
	const url = new URL(request.url);

	try {
		// Try cache first
		const cachedResponse = await caches.match(request);
		if (cachedResponse) {
			console.log(`[SW] Serving ${url.pathname} from cache`);
			return cachedResponse;
		}

		// Fetch from network and cache
		const networkResponse = await fetch(request);
		if (networkResponse.ok) {
			const cache = await caches.open(CACHE_NAME);
			await cache.put(request, networkResponse.clone());
			console.log(`[SW] Cached ${url.pathname} from network`);
		}

		return networkResponse;

	} catch (error) {
		console.error(`[SW] Error handling static request for ${url.pathname}:`, error);
		throw error;
	}
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
	const { type, payload } = event.data;

	switch (type) {
		case 'SKIP_WAITING':
			self.skipWaiting();
			break;

		case 'GET_CACHE_INFO':
			getCacheInfo().then((info) => {
				event.ports[0].postMessage({ type: 'CACHE_INFO', payload: info });
			});
			break;

		case 'CLEAR_CACHE':
			clearAllCaches().then(() => {
				event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
			});
			break;

		case 'PRELOAD_WASM':
			preloadWasmFiles(payload?.files || WASM_URLS).then(() => {
				event.ports[0].postMessage({ type: 'PRELOAD_COMPLETE' });
			});
			break;
	}
});

// Get cache information
async function getCacheInfo() {
	try {
		const cacheNames = await caches.keys();
		let totalSize = 0;
		const entries = [];

		for (const cacheName of cacheNames) {
			if (cacheName.startsWith('gnark-did-wasm')) {
				const cache = await caches.open(cacheName);
				const keys = await cache.keys();

				for (const request of keys) {
					const response = await cache.match(request);
					if (response) {
						const blob = await response.blob();
						totalSize += blob.size;
						entries.push({
							url: request.url,
							size: blob.size,
							cacheName
						});
					}
				}
			}
		}

		return { totalSize, entries };
	} catch (error) {
		console.error('[SW] Error getting cache info:', error);
		return { totalSize: 0, entries: [] };
	}
}

// Clear all caches
async function clearAllCaches() {
	try {
		const cacheNames = await caches.keys();
		for (const cacheName of cacheNames) {
			if (cacheName.startsWith('gnark-did-wasm')) {
				await caches.delete(cacheName);
				console.log(`[SW] Deleted cache: ${cacheName}`);
			}
		}
	} catch (error) {
		console.error('[SW] Error clearing caches:', error);
	}
}

// Preload WASM files
async function preloadWasmFiles(files) {
	try {
		console.log('[SW] Preloading WASM files:', files);
		const cache = await caches.open(WASM_CACHE_NAME);

		for (const file of files) {
			try {
				const request = new Request(file);
				const cachedResponse = await cache.match(request);

				if (!cachedResponse) {
					console.log(`[SW] Preloading ${file}`);
					const response = await fetch(request);

					if (response.ok) {
						// Add cache metadata
						const headers = new Headers(response.headers);
						headers.set('x-cache-time', Date.now().toString());
						headers.set('x-preloaded', 'true');

						const body = await response.arrayBuffer();
						const cachedResponse = new Response(body, {
							status: response.status,
							statusText: response.statusText,
							headers: headers
						});

						await cache.put(request, cachedResponse);
						console.log(`[SW] Preloaded and cached ${file}`);
					}
				} else {
					console.log(`[SW] ${file} already cached, skipping preload`);
				}
			} catch (error) {
				console.error(`[SW] Failed to preload ${file}:`, error);
			}
		}

		console.log('[SW] WASM preloading completed');
	} catch (error) {
		console.error('[SW] Error during WASM preloading:', error);
	}
}

// Background sync for cache optimization
self.addEventListener('sync', (event) => {
	if (event.tag === 'wasm-cache-cleanup') {
		event.waitUntil(cleanupExpiredCache());
	}
});

// Clean up expired cache entries
async function cleanupExpiredCache() {
	try {
		console.log('[SW] Starting cache cleanup');
		const cache = await caches.open(WASM_CACHE_NAME);
		const keys = await cache.keys();
		const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

		for (const request of keys) {
			const response = await cache.match(request);
			if (response) {
				const cacheTime = response.headers.get('x-cache-time');
				if (cacheTime) {
					const age = Date.now() - parseInt(cacheTime, 10);
					if (age > maxAge) {
						await cache.delete(request);
						console.log(`[SW] Deleted expired cache entry: ${request.url}`);
					}
				}
			}
		}

		console.log('[SW] Cache cleanup completed');
	} catch (error) {
		console.error('[SW] Error during cache cleanup:', error);
	}
}