// Service Worker registration and management

interface ServiceWorkerMessage {
	type: string;
	payload?: any;
}

interface CacheInfo {
	totalSize: number;
	entries: Array<{
		url: string;
		size: number;
		cacheName: string;
	}>;
}

class ServiceWorkerManager {
	private registration: ServiceWorkerRegistration | null = null;
	private isSupported = false;

	constructor() {
		this.isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;
	}

	// Register service worker
	async register(): Promise<boolean> {
		if (!this.isSupported) {
			console.log('[SW Manager] Service Worker not supported');
			return false;
		}

		try {
			console.log('[SW Manager] Registering service worker');
			this.registration = await navigator.serviceWorker.register('/sw.js', {
				scope: '/'
			});

			// Handle updates
			this.registration.addEventListener('updatefound', () => {
				console.log('[SW Manager] Service worker update found');
				const newWorker = this.registration?.installing;
				if (newWorker) {
					newWorker.addEventListener('statechange', () => {
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							console.log('[SW Manager] New service worker installed, prompting for update');
							this.promptForUpdate();
						}
					});
				}
			});

			// Listen for messages from service worker
			navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));

			console.log('[SW Manager] Service worker registered successfully');
			return true;
		} catch (error) {
			console.error('[SW Manager] Service worker registration failed:', error);
			return false;
		}
	}

	// Unregister service worker
	async unregister(): Promise<boolean> {
		if (!this.isSupported || !this.registration) {
			return false;
		}

		try {
			const result = await this.registration.unregister();
			console.log('[SW Manager] Service worker unregistered:', result);
			return result;
		} catch (error) {
			console.error('[SW Manager] Service worker unregistration failed:', error);
			return false;
		}
	}

	// Send message to service worker
	private async sendMessage(message: ServiceWorkerMessage): Promise<any> {
		if (!this.isSupported || !navigator.serviceWorker.controller) {
			throw new Error('Service worker not available');
		}

		return new Promise((resolve, reject) => {
			const messageChannel = new MessageChannel();

			messageChannel.port1.onmessage = (event) => {
				if (event.data.error) {
					reject(new Error(event.data.error));
				} else {
					resolve(event.data.payload);
				}
			};

			navigator?.serviceWorker?.controller?.postMessage(message, [messageChannel.port2]);

			// Timeout after 10 seconds
			setTimeout(() => {
				reject(new Error('Service worker message timeout'));
			}, 10000);
		});
	}

	// Handle messages from service worker
	private handleMessage(event: MessageEvent) {
		const { type, payload } = event.data;
		console.log('[SW Manager] Received message:', type, payload);

		// Handle different message types
		switch (type) {
			case 'CACHE_UPDATED':
				console.log('[SW Manager] Cache updated:', payload);
				break;
			case 'PRELOAD_PROGRESS':
				console.log('[SW Manager] Preload progress:', payload);
				break;
			default:
				console.log('[SW Manager] Unknown message type:', type);
		}
	}

	// Get cache information
	async getCacheInfo(): Promise<CacheInfo> {
		try {
			return await this.sendMessage({ type: 'GET_CACHE_INFO' });
		} catch (error) {
			console.error('[SW Manager] Failed to get cache info:', error);
			return { totalSize: 0, entries: [] };
		}
	}

	// Clear all caches
	async clearCache(): Promise<void> {
		try {
			await this.sendMessage({ type: 'CLEAR_CACHE' });
			console.log('[SW Manager] Cache cleared successfully');
		} catch (error) {
			console.error('[SW Manager] Failed to clear cache:', error);
			throw error;
		}
	}

	// Preload WASM files
	async preloadWasm(files?: string[]): Promise<void> {
		try {
			await this.sendMessage({
				type: 'PRELOAD_WASM',
				payload: { files }
			});
			console.log('[SW Manager] WASM preload completed');
		} catch (error) {
			console.error('[SW Manager] Failed to preload WASM:', error);
			throw error;
		}
	}

	// Prompt user for update
	private promptForUpdate(): void {
		if (confirm('A new version is available. Would you like to update?')) {
			this.skipWaiting();
		}
	}

	// Skip waiting and activate new service worker
	private async skipWaiting(): Promise<void> {
		if (!this.registration?.waiting) {
			return;
		}

		try {
			// Tell the waiting service worker to skip waiting
			this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

			// Listen for the controlling service worker to change
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				// Reload the page to get the latest version
				window.location.reload();
			});
		} catch (error) {
			console.error('[SW Manager] Failed to skip waiting:', error);
		}
	}

	// Check if service worker is supported
	isServiceWorkerSupported(): boolean {
		return this.isSupported;
	}

	// Get registration status
	getRegistration(): ServiceWorkerRegistration | null {
		return this.registration;
	}

	// Check if service worker is active
	isActive(): boolean {
		return this.isSupported && !!navigator.serviceWorker.controller;
	}

	// Get service worker state
	getState(): string {
		if (!this.isSupported) return 'not-supported';
		if (!this.registration) return 'not-registered';
		if (!navigator.serviceWorker.controller) return 'not-active';
		return 'active';
	}
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Auto-register service worker when module is imported
if (typeof window !== 'undefined') {
	// Register after page load to avoid blocking
	window.addEventListener('load', () => {
		serviceWorkerManager.register().catch((error) => {
			console.error('[SW Manager] Auto-registration failed:', error);
		});
	});
}

export default serviceWorkerManager;