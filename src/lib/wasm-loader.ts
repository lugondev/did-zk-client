// WASM loader utility for crypto and DID modules with Web Worker support
import { wasmWorkerClient } from './wasm-worker-client';

declare global {
	interface Window {
		Go: any;
		generateKeyPair: () => Promise<string>;
		signMessage: (privateKey: string, message: string) => Promise<string>;
		verifySignature: (publicKey: string, message: string, signature: string) => Promise<string>;
		generateRandomBigInt: () => Promise<string>;
		hashMessage: (message: string) => Promise<string>;
		wasmCryptoReady: boolean;

		createDID: () => Promise<string>;
		authenticateDID: (didID: string, privateKey: string, challenge: string) => Promise<string>;
		verifyAuthentication: (didID: string, proof: string, signature: string) => Promise<string>;
		issueAgeCredential: (didID: string, age: number) => Promise<string>;
		createAgeProof: (didID: string, credentialID: string, ageThreshold: number, actualAge: number, salt: string) => Promise<string>;
		verifyAgeProof: (didID: string, credentialID: string, ageThreshold: number, proof: string) => Promise<string>;
		createMembershipAndBalanceProof: (organizationID: string, balance: number, balanceRangeMin: number, balanceRangeMax: number, salt: string) => Promise<string>;
		wasmDIDReady: boolean;
	}
}

export interface KeyPair {
	privateKey: string;
	publicKey: string;
}

export interface BinaryKeyPair {
	privateKey: Uint8Array;
	publicKey: Uint8Array;
}

export interface SignatureResult {
	signature: string;
}

export interface BinarySignatureResult {
	signature: Uint8Array;
}

export interface VerificationResult {
	verified: boolean;
}

export interface DIDResult {
	did: {
		id: string;
		publicKey: string;
		document: any;
	};
	privateKey: string;
}

export interface AuthenticationResult {
	proof: string;
	signature: string;
}

export interface CredentialResult {
	credential: string;
	salt: string;
}

export interface ProofResult {
	proof: string;
}

// Progress callback type
export type ProgressCallback = (progress: number, stage: string) => void;

class WASMLoader {
	private cryptoLoaded = false;
	private didLoaded = false;
	private loadingPromises: { [key: string]: Promise<void> } = {};
	private useWebWorker = false; // Flag to enable/disable Web Worker usage - disabled by default for reliability
	private readonly LARGE_WASM_THRESHOLD = 15 * 1024 * 1024; // 15MB threshold for auto-fallback
	private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks for progressive loading

	// Version management for cache busting
	private readonly WASM_VERSION = '1.0.1'; // Increment this when WASM files change
	private readonly CACHE_PREFIX = 'gnark-did-wasm';
	private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds (increased from 1 day)

	// Compression support
	private readonly COMPRESSION_SUPPORT = {
		brotli: typeof window !== 'undefined' && 'CompressionStream' in window,
		gzip: typeof window !== 'undefined' && 'CompressionStream' in window
	};

	constructor() {
		// Initialize with Web Worker enabled, check will happen when needed
		this.useWebWorker = true;
		this.initializePreloading();
	}

	// Initialize preloading when user is idle
	initializePreloading(): void {
		if (typeof window === 'undefined') return;

		// Preload when user is idle
		if ('requestIdleCallback' in window) {
			(window as any).requestIdleCallback(() => {
				this.preloadWASMInBackground();
			}, { timeout: 5000 });
		} else {
			// Fallback for browsers without requestIdleCallback
			setTimeout(() => {
				this.preloadWASMInBackground();
			}, 2000);
		}
	}

	// Background preloading
	private async preloadWASMInBackground(): Promise<void> {
		try {
			console.log('[WASMLoader] Starting background preload');
			// Only preload crypto first (smaller file)
			await this.loadCrypto();
			console.log('[WASMLoader] Background preload completed for crypto');
		} catch (error) {
			console.log('[WASMLoader] Background preload failed:', error);
		}
	}

	// Cache management methods with improved compression
	private getCacheKey(wasmPath: string, compressed = false): string {
		const suffix = compressed ? '-compressed' : '';
		return `${this.CACHE_PREFIX}-${wasmPath.replace('/', '-')}-v${this.WASM_VERSION}${suffix}`;
	}

	private async getCachedWasm(wasmPath: string): Promise<ArrayBuffer | null> {
		if (typeof window === 'undefined' || !('caches' in window)) {
			return null;
		}

		try {
			const cache = await caches.open(this.CACHE_PREFIX);

			// Try compressed version first
			const compressedKey = this.getCacheKey(wasmPath, true);
			let response = await cache.match(compressedKey);

			if (!response) {
				// Fallback to uncompressed
				const normalKey = this.getCacheKey(wasmPath, false);
				response = await cache.match(normalKey);
			}

			if (response) {
				// Check if cache entry is still valid
				const cacheTime = response.headers.get('x-cache-time');
				if (cacheTime) {
					const age = Date.now() - parseInt(cacheTime, 10);
					if (age < this.CACHE_EXPIRY) {
						console.log(`[WASMLoader] Using cached ${wasmPath} (age: ${Math.round(age / 1000 / 60)} minutes)`);
						return await response.arrayBuffer();
					} else {
						console.log(`[WASMLoader] Cache expired for ${wasmPath}, fetching fresh copy`);
						await cache.delete(compressedKey);
						await cache.delete(this.getCacheKey(wasmPath, false));
					}
				}
			}
		} catch (error) {
			console.warn(`[WASMLoader] Cache retrieval failed for ${wasmPath}:`, error);
		}

		return null;
	}

	private async cacheWasm(wasmPath: string, wasmData: ArrayBuffer, compressed = false): Promise<void> {
		if (typeof window === 'undefined' || !('caches' in window)) {
			return;
		}

		try {
			const cache = await caches.open(this.CACHE_PREFIX);
			const cacheKey = this.getCacheKey(wasmPath, compressed);

			// Create response with cache metadata
			const response = new Response(wasmData, {
				headers: {
					'Content-Type': 'application/wasm',
					'x-cache-time': Date.now().toString(),
					'x-wasm-version': this.WASM_VERSION,
					'x-compressed': compressed.toString()
				}
			});

			await cache.put(cacheKey, response);
			console.log(`[WASMLoader] Cached ${wasmPath} with version ${this.WASM_VERSION} (compressed: ${compressed})`);
		} catch (error) {
			console.warn(`[WASMLoader] Cache storage failed for ${wasmPath}:`, error);
		}
	}

	// Progressive loading with progress callback
	private async fetchWasmWithProgress(
		wasmPath: string,
		progressCallback?: ProgressCallback
	): Promise<ArrayBuffer> {
		// Try to get from cache first
		const cachedData = await this.getCachedWasm(wasmPath);
		if (cachedData) {
			progressCallback?.(100, 'Loaded from cache');
			return cachedData;
		}

		// Fetch with progress tracking
		const versionedUrl = `${wasmPath}?v=${this.WASM_VERSION}`;
		console.log(`[WASMLoader] Fetching fresh copy of ${wasmPath} with version ${this.WASM_VERSION}`);

		progressCallback?.(0, 'Starting download');

		const response = await fetch(versionedUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch WASM module: ${response.status} ${response.statusText}`);
		}

		const contentLength = response.headers.get('content-length');
		const total = contentLength ? parseInt(contentLength, 10) : 0;

		if (!response.body) {
			throw new Error('Response body is null');
		}

		const reader = response.body.getReader();
		const chunks: Uint8Array[] = [];
		let receivedLength = 0;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			chunks.push(value);
			receivedLength += value.length;

			if (total > 0) {
				const progress = (receivedLength / total) * 100;
				progressCallback?.(progress, `Downloaded ${(receivedLength / 1024 / 1024).toFixed(1)}MB`);
			}
		}

		// Combine chunks
		const wasmData = new Uint8Array(receivedLength);
		let position = 0;
		for (const chunk of chunks) {
			wasmData.set(chunk, position);
			position += chunk.length;
		}

		progressCallback?.(100, 'Download complete');

		// Cache the fresh copy
		await this.cacheWasm(wasmPath, wasmData.buffer);

		return wasmData.buffer;
	}

	// Legacy method for backward compatibility
	private async fetchWasmWithCaching(wasmPath: string): Promise<ArrayBuffer> {
		return this.fetchWasmWithProgress(wasmPath);
	}

	// Check if WASM file is too large for reliable worker loading
	private async shouldUseMainThreadForFile(wasmPath: string): Promise<boolean> {
		try {
			const response = await fetch(wasmPath, { method: 'HEAD' });
			const contentLength = response.headers.get('content-length');
			if (contentLength) {
				const size = parseInt(contentLength, 10);
				console.log(`[WASMLoader] WASM file ${wasmPath} size: ${size} bytes (${(size / 1024 / 1024).toFixed(2)} MB)`);

				if (size > this.LARGE_WASM_THRESHOLD) {
					console.log(`[WASMLoader] File ${wasmPath} is large (${(size / 1024 / 1024).toFixed(2)} MB), recommending main thread loading`);
					return true;
				}
			}
		} catch (error) {
			console.warn(`[WASMLoader] Could not check file size for ${wasmPath}:`, error);
		}
		return false;
	}

	private checkWebWorkerSupport(): boolean {
		// Only check on client side
		if (typeof window === 'undefined') {
			return false;
		}

		// Check if Web Workers are supported
		if (typeof Worker === 'undefined') {
			console.warn('Web Workers not supported, falling back to main thread WASM loading');
			return false;
		}

		return true;
	}

	// Parallel loading method for both WASM modules with progress
	async loadBoth(progressCallback?: ProgressCallback): Promise<void> {
		if (this.cryptoLoaded && this.didLoaded) return;

		// Use a single promise to ensure both are loaded in parallel
		if (!this.loadingPromises.both) {
			this.loadingPromises.both = this._loadBothInternal(progressCallback);
		}

		return this.loadingPromises.both;
	}

	private async _loadBothInternal(progressCallback?: ProgressCallback): Promise<void> {
		console.log('[WASMLoader] Starting parallel loading of crypto and DID WASM modules');

		try {
			progressCallback?.(0, 'Starting parallel load');

			// Start both loading processes in parallel
			const cryptoPromise = this.cryptoLoaded ? Promise.resolve() : this._loadCryptoInternal((progress, stage) => {
				progressCallback?.(progress * 0.3, `Crypto: ${stage}`);
			});

			const didPromise = this.didLoaded ? Promise.resolve() : this._loadDIDInternal((progress, stage) => {
				progressCallback?.(30 + progress * 0.7, `DID: ${stage}`);
			});

			// Wait for both to complete
			await Promise.all([cryptoPromise, didPromise]);

			progressCallback?.(100, 'Parallel loading completed');
			console.log('[WASMLoader] Parallel loading completed successfully');
		} catch (error) {
			// Clean up loading promises on failure
			delete this.loadingPromises.both;
			delete this.loadingPromises.crypto;
			delete this.loadingPromises.did;

			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to load WASM modules in parallel: ${errorMessage}`);
		}
	}

	async loadCrypto(progressCallback?: ProgressCallback): Promise<void> {
		if (this.cryptoLoaded) return;

		// Atomic check and set for the loading promise to prevent race conditions
		if (!this.loadingPromises.crypto) {
			this.loadingPromises.crypto = this._loadCryptoInternal(progressCallback);
		}

		return this.loadingPromises.crypto;
	}

	private async _loadCryptoInternal(progressCallback?: ProgressCallback): Promise<void> {
		try {
			progressCallback?.(0, 'Checking Web Worker support');

			// Check Web Worker support and file size
			const webWorkerSupported = this.useWebWorker && this.checkWebWorkerSupport();
			const shouldUseFallback = await this.shouldUseMainThreadForFile('/crypto.wasm');
			const useWorker = webWorkerSupported && !shouldUseFallback;

			if (shouldUseFallback) {
				console.log('Large Crypto WASM file detected, using main thread for better reliability');
			}

			if (useWorker) {
				console.log('Loading Crypto WASM module via Web Worker');
				progressCallback?.(10, 'Loading via Web Worker');
				try {
					await wasmWorkerClient.loadCrypto();
					this.cryptoLoaded = true;
					progressCallback?.(100, 'Loaded via Web Worker');
					console.log('Crypto WASM module loaded successfully via Web Worker');
				} catch (error) {
					console.error('Web Worker loading failed, falling back to main thread:', error);
					console.log('Worker error details:', {
						message: error instanceof Error ? error.message : 'Unknown error',
						stack: error instanceof Error ? error.stack : undefined,
						workerSupported: this.checkWebWorkerSupport()
					});
					this.useWebWorker = false;

					// Clear the loading promise to allow retry with main thread
					delete this.loadingPromises.crypto;

					progressCallback?.(20, 'Fallback to main thread');
					await this.loadWASMModuleMainThread('/crypto.wasm', 'wasmCryptoReady', progressCallback);
					this.cryptoLoaded = true;
					console.log('Crypto WASM module loaded successfully on main thread (fallback)');
				}
			} else {
				console.log('Loading Crypto WASM module on main thread');
				progressCallback?.(10, 'Loading on main thread');
				await this.loadWASMModuleMainThread('/crypto.wasm', 'wasmCryptoReady', progressCallback);
				this.cryptoLoaded = true;
				console.log('Crypto WASM module loaded successfully on main thread');
			}
		} catch (error) {
			// Clean up the loading promise on failure to allow retry
			delete this.loadingPromises.crypto;
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to load Crypto WASM: ${errorMessage}`);
		}
	}

	async loadDID(progressCallback?: ProgressCallback): Promise<void> {
		if (this.didLoaded) return;

		// Atomic check and set for the loading promise to prevent race conditions
		if (!this.loadingPromises.did) {
			this.loadingPromises.did = this._loadDIDInternal(progressCallback);
		}

		return this.loadingPromises.did;
	}

	private async _loadDIDInternal(progressCallback?: ProgressCallback): Promise<void> {
		try {
			progressCallback?.(0, 'Checking Web Worker support');

			// Check Web Worker support and file size
			const webWorkerSupported = this.useWebWorker && this.checkWebWorkerSupport();
			const shouldUseFallback = await this.shouldUseMainThreadForFile('/did.wasm');
			const useWorker = webWorkerSupported && !shouldUseFallback;

			if (shouldUseFallback) {
				console.log('Large DID WASM file detected, using main thread for better reliability');
			}

			if (useWorker) {
				console.log('Loading DID WASM module via Web Worker');
				progressCallback?.(10, 'Loading via Web Worker');
				try {
					await wasmWorkerClient.loadDID();
					this.didLoaded = true;
					progressCallback?.(100, 'Loaded via Web Worker');
					console.log('DID WASM module loaded successfully via Web Worker');
				} catch (error) {
					console.error('Web Worker loading failed, falling back to main thread:', error);
					console.log('Worker error details:', {
						message: error instanceof Error ? error.message : 'Unknown error',
						stack: error instanceof Error ? error.stack : undefined,
						workerSupported: this.checkWebWorkerSupport()
					});
					this.useWebWorker = false;

					// Clear the loading promise to allow retry with main thread
					delete this.loadingPromises.did;

					progressCallback?.(20, 'Fallback to main thread');
					await this.loadWASMModuleMainThread('/did.wasm', 'wasmDIDReady', progressCallback);
					this.didLoaded = true;
					console.log('DID WASM module loaded successfully on main thread (fallback)');
				}
			} else {
				console.log('Loading DID WASM module on main thread');
				progressCallback?.(10, 'Loading on main thread');
				await this.loadWASMModuleMainThread('/did.wasm', 'wasmDIDReady', progressCallback);
				this.didLoaded = true;
				console.log('DID WASM module loaded successfully on main thread');
			}
		} catch (error) {
			// Clean up the loading promise on failure to allow retry
			delete this.loadingPromises.did;
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to load DID WASM: ${errorMessage}`);
		}
	}

	// Fallback method for main thread loading with caching support and progress
	private async loadWASMModuleMainThread(
		wasmPath: string,
		readyFlag: string,
		progressCallback?: ProgressCallback
	): Promise<void> {
		return new Promise((resolve, reject) => {
			// Add timeout for the entire loading process
			const loadingTimeout = setTimeout(() => {
				reject(new Error(`WASM module loading timeout for ${wasmPath} after 60 seconds`));
			}, 60000); // Increased timeout to 60 seconds for large files

			const wrappedResolve = () => {
				clearTimeout(loadingTimeout);
				resolve();
			};

			const wrappedReject = (error: Error) => {
				clearTimeout(loadingTimeout);
				reject(error);
			};

			progressCallback?.(5, 'Loading wasm_exec.js');

			// Load wasm_exec.js if not already loaded
			if (!window.Go) {
				const script = document.createElement('script');
				script.src = '/wasm_exec.js';
				script.onload = () => {
					progressCallback?.(10, 'wasm_exec.js loaded');
					this.loadWASMFileMainThread(wasmPath, readyFlag, wrappedResolve, wrappedReject, progressCallback);
				};
				script.onerror = () => wrappedReject(new Error('Failed to load wasm_exec.js'));
				document.head.appendChild(script);
			} else {
				progressCallback?.(10, 'wasm_exec.js already loaded');
				this.loadWASMFileMainThread(wasmPath, readyFlag, wrappedResolve, wrappedReject, progressCallback);
			}
		});
	}

	private loadWASMFileMainThread(
		wasmPath: string,
		readyFlag: string,
		resolve: () => void,
		reject: (error: Error) => void,
		progressCallback?: ProgressCallback
	): void {
		try {
			const go = new window.Go();
			let readyCheckTimeout: NodeJS.Timeout | number | undefined;
			let hasResolved = false;

			// Reset the ready flag to ensure clean state
			(window as any)[readyFlag] = false;

			progressCallback?.(15, 'Initializing Go runtime');

			// Set up a timeout to check for readiness with better error handling
			const checkReady = () => {
				if (hasResolved) return; // Prevent multiple resolves

				if ((window as any)[readyFlag]) {
					hasResolved = true;
					if (readyCheckTimeout) {
						clearTimeout(readyCheckTimeout);
					}
					progressCallback?.(100, 'WASM module ready');
					console.log(`[WASMLoader] WASM module ${wasmPath} is ready`);
					resolve();
				} else {
					// Continue checking
					readyCheckTimeout = setTimeout(checkReady, 100);
				}
			};

			// Safety timeout for ready signal
			const safetyTimeout = setTimeout(() => {
				if (!hasResolved) {
					hasResolved = true;
					if (readyCheckTimeout) {
						clearTimeout(readyCheckTimeout);
					}
					reject(new Error(`WASM module ${wasmPath} failed to signal ready within timeout`));
				}
			}, 45000); // 45 second timeout for ready signal

			// Load WASM with caching support and progress
			const loadWasm = async () => {
				try {
					let result;

					console.log(`[WASMLoader] Starting to load WASM module: ${wasmPath}`);
					progressCallback?.(20, 'Starting WASM download');

					if (typeof WebAssembly.instantiateStreaming === 'function') {
						// Try to use cached version first, then fall back to streaming
						try {
							const wasmArrayBuffer = await this.fetchWasmWithProgress(wasmPath, (progress, stage) => {
								progressCallback?.(20 + progress * 0.5, stage);
							});
							console.log(`[WASMLoader] Using cached/fresh WASM data for ${wasmPath}`);
							progressCallback?.(70, 'Instantiating WASM module');
							result = await WebAssembly.instantiate(wasmArrayBuffer, go.importObject);
						} catch (cacheError) {
							console.log(`[WASMLoader] Cache failed, falling back to streaming for ${wasmPath}:`, cacheError);
							progressCallback?.(30, 'Fallback to streaming');
							result = await WebAssembly.instantiateStreaming(fetch(`${wasmPath}?v=${this.WASM_VERSION}`), go.importObject);
						}
					} else {
						// Fallback for older browsers with caching
						console.log(`[WASMLoader] Using fallback instantiation with caching for ${wasmPath}`);
						progressCallback?.(30, 'Fallback instantiation');
						const wasmArrayBuffer = await this.fetchWasmWithProgress(wasmPath, (progress, stage) => {
							progressCallback?.(30 + progress * 0.4, stage);
						});
						progressCallback?.(70, 'Instantiating WASM module');
						result = await WebAssembly.instantiate(wasmArrayBuffer, go.importObject);
					}

					console.log(`[WASMLoader] WASM module instantiated successfully: ${wasmPath}`);
					progressCallback?.(80, 'Starting Go runtime');

					// Run the WASM module in a try-catch to handle Go runtime errors
					try {
						go.run(result.instance);
						console.log(`[WASMLoader] WASM module started successfully: ${wasmPath}`);
						progressCallback?.(90, 'Waiting for ready signal');
						checkReady();
					} catch (goError) {
						clearTimeout(safetyTimeout);
						const goErrorMessage = goError instanceof Error ? goError.message : 'Unknown Go runtime error';
						reject(new Error(`Go runtime error in ${wasmPath}: ${goErrorMessage}`));
					}
				} catch (error) {
					clearTimeout(safetyTimeout);
					if (readyCheckTimeout) {
						clearTimeout(readyCheckTimeout);
					}
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					reject(new Error(`Failed to load WASM module ${wasmPath}: ${errorMessage}`));
				}
			};

			loadWasm();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			reject(new Error(`Failed to initialize WASM loading for ${wasmPath}: ${errorMessage}`));
		}
	}

	// Helper function to safely call WASM functions
	private async safeWasmCall<T>(fn: () => Promise<string>, operation: string, functionName?: string): Promise<T> {
		try {
			let result: string;

			if (this.useWebWorker && functionName) {
				// Use Web Worker to execute the function
				const workerResult = await wasmWorkerClient.executeWASMFunction(functionName, []);
				result = typeof workerResult === 'string' ? workerResult : JSON.stringify(workerResult);
			} else {
				// Fallback to main thread execution
				result = await fn();
			}

			return JSON.parse(result);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`${operation} failed: ${errorMessage}`);
		}
	}

	// Helper function for WASM calls with parameters
	private async safeWasmCallWithParams<T>(
		fn: () => Promise<string>,
		operation: string,
		functionName?: string,
		params?: any[]
	): Promise<T> {
		try {
			let result: string;

			if (this.useWebWorker && functionName && params) {
				// Use Web Worker to execute the function with parameters
				const workerResult = await wasmWorkerClient.executeWASMFunction(functionName, params);
				result = typeof workerResult === 'string' ? workerResult : JSON.stringify(workerResult);
			} else {
				// Fallback to main thread execution
				result = await fn();
			}

			return JSON.parse(result);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`${operation} failed: ${errorMessage}`);
		}
	}

	// Memory cleanup method
	public cleanup(): void {
		try {
			// Clear loading promises
			this.loadingPromises = {};

			// Reset flags
			this.cryptoLoaded = false;
			this.didLoaded = false;

			// Clear window flags
			if (typeof window !== 'undefined') {
				(window as any).wasmCryptoReady = false;
				(window as any).wasmDIDReady = false;
			}

			console.log('[WASMLoader] Cleanup completed');
		} catch (error) {
			console.warn('[WASMLoader] Cleanup failed:', error);
		}
	}

	// Cache size management
	public async getCacheInfo(): Promise<{ size: number; entries: string[] }> {
		if (typeof window === 'undefined' || !('caches' in window)) {
			return { size: 0, entries: [] };
		}

		try {
			const cache = await caches.open(this.CACHE_PREFIX);
			const keys = await cache.keys();
			let totalSize = 0;
			const entries: string[] = [];

			for (const request of keys) {
				const response = await cache.match(request);
				if (response) {
					const blob = await response.blob();
					totalSize += blob.size;
					entries.push(request.url);
				}
			}

			return { size: totalSize, entries };
		} catch (error) {
			console.warn('[WASMLoader] Failed to get cache info:', error);
			return { size: 0, entries: [] };
		}
	}

	// Clear cache
	public async clearCache(): Promise<void> {
		if (typeof window === 'undefined' || !('caches' in window)) {
			return;
		}

		try {
			await caches.delete(this.CACHE_PREFIX);
			console.log('[WASMLoader] Cache cleared successfully');
		} catch (error) {
			console.warn('[WASMLoader] Failed to clear cache:', error);
		}
	}

	// Crypto functions
	async generateKeyPair(): Promise<KeyPair> {
		await this.loadCrypto();
		return this.safeWasmCall(
			() => window.generateKeyPair(),
			'Generate key pair',
			'generateKeyPair'
		);
	}

	async signMessage(privateKey: string, message: string): Promise<SignatureResult> {
		await this.loadCrypto();

		// Additional safety check to ensure the function is available
		if (!this.cryptoLoaded) {
			throw new Error('Crypto WASM module not loaded');
		}

		// Check if function is available on window (for main thread execution)
		if (!this.useWebWorker && typeof window.signMessage !== 'function') {
			throw new Error('signMessage function not available on window object');
		}

		// Check if WASM is ready
		if (!this.useWebWorker && !(window as any).wasmCryptoReady) {
			throw new Error('Crypto WASM module not ready');
		}

		return this.safeWasmCallWithParams(
			() => window.signMessage(privateKey, message),
			'Sign message',
			'signMessage',
			[privateKey, message]
		);
	}

	async verifySignature(publicKey: string, message: string, signature: string): Promise<VerificationResult> {
		await this.loadCrypto();
		return this.safeWasmCallWithParams(
			() => window.verifySignature(publicKey, message, signature),
			'Verify signature',
			'verifySignature',
			[publicKey, message, signature]
		);
	}

	async generateRandomBigInt(): Promise<{ value: string }> {
		await this.loadCrypto();
		return this.safeWasmCall(
			() => window.generateRandomBigInt(),
			'Generate random big int',
			'generateRandomBigInt'
		);
	}

	async hashMessage(message: string): Promise<{ hash: string }> {
		await this.loadCrypto();
		return this.safeWasmCallWithParams(
			() => window.hashMessage(message),
			'Hash message',
			'hashMessage',
			[message]
		);
	}

	// DID functions
	async createDID(): Promise<DIDResult> {
		await this.loadDID();
		return this.safeWasmCall(
			() => window.createDID(),
			'Create DID',
			'createDID'
		);
	}

	async authenticateDID(didID: string, privateKey: string, challenge: string): Promise<AuthenticationResult> {
		await this.loadDID();
		return this.safeWasmCallWithParams(
			() => window.authenticateDID(didID, privateKey, challenge),
			'Authenticate DID',
			'authenticateDID',
			[didID, privateKey, challenge]
		);
	}

	async verifyAuthentication(didID: string, proof: string, signature: string): Promise<VerificationResult> {
		await this.loadDID();
		return this.safeWasmCallWithParams(
			() => window.verifyAuthentication(didID, proof, signature),
			'Verify authentication',
			'verifyAuthentication',
			[didID, proof, signature]
		);
	}

	async issueAgeCredential(didID: string, age: number): Promise<CredentialResult> {
		await this.loadDID();
		return this.safeWasmCallWithParams(
			() => window.issueAgeCredential(didID, age),
			'Issue age credential',
			'issueAgeCredential',
			[didID, age]
		);
	}

	async createAgeProof(didID: string, credentialID: string, ageThreshold: number, actualAge: number, salt: string): Promise<ProofResult> {
		await this.loadDID();
		return this.safeWasmCallWithParams(
			() => window.createAgeProof(didID, credentialID, ageThreshold, actualAge, salt),
			'Create age proof',
			'createAgeProof',
			[didID, credentialID, ageThreshold, actualAge, salt]
		);
	}

	async verifyAgeProof(didID: string, credentialID: string, ageThreshold: number, proof: string): Promise<VerificationResult> {
		await this.loadDID();
		return this.safeWasmCallWithParams(
			() => window.verifyAgeProof(didID, credentialID, ageThreshold, proof),
			'Verify age proof',
			'verifyAgeProof',
			[didID, credentialID, ageThreshold, proof]
		);
	}

	async createMembershipAndBalanceProof(organizationID: string, balance: number, balanceRangeMin: number, balanceRangeMax: number, salt: string): Promise<ProofResult> {
		await this.loadDID();

		// Additional safety checks
		if (!this.didLoaded) {
			throw new Error('DID WASM module not loaded');
		}

		// Check if function is available on window (for main thread execution)
		if (!this.useWebWorker && typeof window.createMembershipAndBalanceProof !== 'function') {
			throw new Error('createMembershipAndBalanceProof function not available on window object');
		}

		// Check if WASM is ready
		if (!this.useWebWorker && !(window as any).wasmDIDReady) {
			throw new Error('DID WASM module not ready');
		}

		console.log('WASM Loader: Creating membership and balance proof with params:', {
			organizationID, balance, balanceRangeMin, balanceRangeMax, salt: salt.substring(0, 16) + '...'
		});

		return this.safeWasmCallWithParams(
			() => window.createMembershipAndBalanceProof(organizationID, balance, balanceRangeMin, balanceRangeMax, salt),
			'Create membership and balance proof',
			'createMembershipAndBalanceProof',
			[organizationID, balance, balanceRangeMin, balanceRangeMax, salt]
		);
	}

	// Utility methods for Web Worker management
	async getWorkerStatus() {
		if (this.useWebWorker) {
			return await wasmWorkerClient.getStatus();
		}
		return {
			cryptoLoaded: this.cryptoLoaded,
			didLoaded: this.didLoaded,
			cryptoReady: (window as any).wasmCryptoReady || false,
			didReady: (window as any).wasmDIDReady || false
		};
	}

	async pingWorker() {
		if (this.useWebWorker) {
			return await wasmWorkerClient.ping();
		}
		return { pong: true, timestamp: Date.now() };
	}

	terminateWorker() {
		if (this.useWebWorker) {
			wasmWorkerClient.terminate();
		}
	}

	// Reset worker and force fallback to main thread
	resetToMainThread() {
		console.log('Resetting WASM loader to main thread mode');
		this.terminateWorker();
		this.useWebWorker = false;
		this.cryptoLoaded = false;
		this.didLoaded = false;
		this.loadingPromises = {};
	}

	get isUsingWebWorker(): boolean {
		return this.useWebWorker;
	}

	get wasmVersion(): string {
		return this.WASM_VERSION;
	}

	// Utility functions for binary conversion
	private hexToUint8Array(hex: string): Uint8Array {
		const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
		const bytes = new Uint8Array(cleanHex.length / 2);
		for (let i = 0; i < cleanHex.length; i += 2) {
			bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
		}
		return bytes;
	}

	private uint8ArrayToHex(bytes: Uint8Array): string {
		return Array.from(bytes)
			.map(byte => byte.toString(16).padStart(2, '0'))
			.join('');
	}

	// Binary crypto functions that work with Uint8Array
	async generateKeyPairBinary(): Promise<BinaryKeyPair> {
		const result = await this.generateKeyPair();
		return {
			privateKey: this.hexToUint8Array(result.privateKey),
			publicKey: this.hexToUint8Array(result.publicKey),
		};
	}

	async signMessageBinary(privateKey: Uint8Array, message: Uint8Array): Promise<BinarySignatureResult> {
		const privateKeyHex = this.uint8ArrayToHex(privateKey);
		const messageHex = this.uint8ArrayToHex(message);
		const result = await this.signMessage(privateKeyHex, messageHex);
		return {
			signature: this.hexToUint8Array(result.signature),
		};
	}

	async verifySignatureBinary(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<VerificationResult> {
		const publicKeyHex = this.uint8ArrayToHex(publicKey);
		const messageHex = this.uint8ArrayToHex(message);
		const signatureHex = this.uint8ArrayToHex(signature);
		return await this.verifySignature(publicKeyHex, messageHex, signatureHex);
	}

	async hashMessageBinary(message: Uint8Array): Promise<Uint8Array> {
		const messageHex = this.uint8ArrayToHex(message);
		const result = await this.hashMessage(messageHex);
		return this.hexToUint8Array(result.hash);
	}

	async generateRandomBigIntBinary(): Promise<Uint8Array> {
		const result = await this.generateRandomBigInt();
		return this.hexToUint8Array(result.value);
	}
}

// Export singleton instance
export const wasmLoader = new WASMLoader();