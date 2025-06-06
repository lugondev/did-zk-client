// Web Worker for loading and managing WASM modules
// This prevents the main thread from being blocked during WASM loading

class WASMWorkerManager {
	constructor() {
		this.cryptoLoaded = false;
		this.didLoaded = false;
		this.loadingPromises = {};
		this.wasmModules = {};
		this.go = null;
	}

	async loadWASMModule(wasmPath, readyFlag) {
		console.log(`[WASMWorkerManager] Starting loadWASMModule for ${wasmPath} with readyFlag ${readyFlag}`);

		return new Promise((resolve, reject) => {
			// Load wasm_exec.js if not already loaded
			if (!this.go) {
				console.log('[WASMWorkerManager] Loading wasm_exec.js for the first time');
				try {
					importScripts('/wasm_exec.js');
					this.go = new Go();
					console.log('[WASMWorkerManager] wasm_exec.js loaded successfully');
				} catch (error) {
					console.error('[WASMWorkerManager] Failed to load wasm_exec.js:', error);
					reject(new Error(`Failed to load wasm_exec.js: ${error.message}`));
					return;
				}
			}

			// Create new Go instance for each module
			// Reset any existing global state first
			if (self[readyFlag]) {
				console.log(`[WASMWorkerManager] Warning: ${readyFlag} already exists, resetting...`);
				self[readyFlag] = false;
			}

			const go = new Go();
			console.log(`[WASMWorkerManager] Created new Go instance for ${wasmPath}`);

			// Set up a timeout for the ready check
			let readyCheckCount = 0;
			const maxReadyChecks = 600; // 60 seconds with 100ms intervals (increased for large WASM files)

			// Set up a timeout to check for readiness
			const checkReady = () => {
				readyCheckCount++;
				const elapsedMs = readyCheckCount * 100;

				// Log progress every 5 seconds for large files
				if (readyCheckCount % 50 === 0) {
					console.log(`[WASMWorkerManager] Still waiting for ${readyFlag}, elapsed: ${elapsedMs}ms`);
				}

				if (self[readyFlag]) {
					console.log(`[WASMWorkerManager] ${readyFlag} is ready after ${elapsedMs}ms`);
					resolve();
				} else if (readyCheckCount >= maxReadyChecks) {
					console.error(`[WASMWorkerManager] Timeout waiting for ${readyFlag} after ${elapsedMs}ms (${maxReadyChecks} checks)`);
					console.error(`[WASMWorkerManager] Available global flags:`, Object.keys(self).filter(key => key.includes('wasm')));
					reject(new Error(`Timeout waiting for ${readyFlag} to be ready after ${elapsedMs}ms`));
				} else {
					setTimeout(checkReady, 100);
				}
			};

			// Load WASM with fallback for different browsers
			const loadWasm = async () => {
				try {
					console.log(`[WASMWorkerManager] Fetching WASM file: ${wasmPath}`);
					let result;

					if (typeof WebAssembly.instantiateStreaming === 'function') {
						console.log('[WASMWorkerManager] Using WebAssembly.instantiateStreaming');
						// Modern browsers with streaming support
						const fetchResponse = fetch(wasmPath);
						result = await WebAssembly.instantiateStreaming(fetchResponse, go.importObject);
					} else {
						console.log('[WASMWorkerManager] Using fallback WebAssembly.instantiate');
						// Fallback for older browsers
						const response = await fetch(wasmPath);
						if (!response.ok) {
							throw new Error(`Failed to fetch ${wasmPath}: ${response.status} ${response.statusText}`);
						}
						console.log(`[WASMWorkerManager] WASM file fetched, size: ${response.headers.get('content-length')} bytes`);
						const wasmArrayBuffer = await response.arrayBuffer();
						console.log(`[WASMWorkerManager] WASM ArrayBuffer created, size: ${wasmArrayBuffer.byteLength} bytes`);
						result = await WebAssembly.instantiate(wasmArrayBuffer, go.importObject);
					}

					console.log(`[WASMWorkerManager] WASM instantiated successfully for ${wasmPath}`);

					// Store the module instance
					this.wasmModules[wasmPath] = result.instance;

					// Run the WASM module
					console.log(`[WASMWorkerManager] Running WASM module for ${wasmPath}`);

					// Wrap go.run in a try-catch to handle any runtime errors
					try {
						go.run(result.instance);
						console.log(`[WASMWorkerManager] WASM module started successfully, checking ready flag: ${readyFlag}`);
						checkReady();
					} catch (runError) {
						console.error(`[WASMWorkerManager] Error running WASM module ${wasmPath}:`, runError);
						reject(new Error(`Failed to run WASM module ${wasmPath}: ${runError.message}`));
					}
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					console.error(`[WASMWorkerManager] Failed to load WASM module ${wasmPath}:`, error);
					reject(new Error(`Failed to load WASM module ${wasmPath}: ${errorMessage}`));
				}
			};

			loadWasm();
		});
	}

	async loadCrypto() {
		if (this.cryptoLoaded) return;

		if (this.loadingPromises.crypto) {
			return this.loadingPromises.crypto;
		}

		this.loadingPromises.crypto = this.loadWASMModule('/crypto.wasm', 'wasmCryptoReady')
			.then(() => {
				this.cryptoLoaded = true;
				self.postMessage({
					type: 'CRYPTO_LOADED',
					success: true,
					message: 'Crypto WASM module loaded successfully'
				});
			})
			.catch((error) => {
				self.postMessage({
					type: 'CRYPTO_LOADED',
					success: false,
					error: error.message
				});
				throw error;
			});

		return this.loadingPromises.crypto;
	}

	async loadDID() {
		console.log('[WASMWorkerManager] Starting loadDID, current status:', this.didLoaded);

		if (this.didLoaded) {
			console.log('[WASMWorkerManager] DID already loaded, returning immediately');
			return;
		}

		if (this.loadingPromises.did) {
			console.log('[WASMWorkerManager] DID loading already in progress, awaiting existing promise');
			return this.loadingPromises.did;
		}

		console.log('[WASMWorkerManager] Starting DID WASM module loading...');
		this.loadingPromises.did = this.loadWASMModule('/did.wasm', 'wasmDIDReady')
			.then(() => {
				console.log('[WASMWorkerManager] DID WASM module loaded successfully');
				this.didLoaded = true;
				self.postMessage({
					type: 'DID_LOADED',
					success: true,
					message: 'DID WASM module loaded successfully'
				});
			})
			.catch((error) => {
				console.error('[WASMWorkerManager] DID WASM module loading failed:', error);
				self.postMessage({
					type: 'DID_LOADED',
					success: false,
					error: error.message
				});
				throw error;
			});

		return this.loadingPromises.did;
	}

	async executeWASMFunction(functionName, args = []) {
		try {
			// Check if the function exists in the global scope
			if (typeof self[functionName] !== 'function') {
				throw new Error(`WASM function ${functionName} not available`);
			}

			// Call the WASM function
			const result = await self[functionName](...args);

			// Handle result based on type
			let parsedResult;
			if (typeof result === 'string') {
				try {
					parsedResult = JSON.parse(result);
				} catch (parseError) {
					// If JSON parsing fails, return the string as-is
					console.warn(`[WASMWorker] Failed to parse result as JSON for ${functionName}:`, parseError);
					parsedResult = result;
				}
			} else {
				parsedResult = result;
			}

			return {
				success: true,
				result: parsedResult
			};
		} catch (error) {
			return {
				success: false,
				error: error.message
			};
		}
	}

	getStatus() {
		return {
			cryptoLoaded: this.cryptoLoaded,
			didLoaded: this.didLoaded,
			cryptoReady: self.wasmCryptoReady || false,
			didReady: self.wasmDIDReady || false
		};
	}
}

// Initialize the worker manager
const wasmManager = new WASMWorkerManager();

console.log('[WASMWorker] Worker script loaded, manager initialized');

// Handle messages from the main thread
self.addEventListener('message', async (event) => {
	const { type, id, payload } = event.data;

	console.log(`[WASMWorker] Received message: ${type} with ID: ${id}`);

	try {
		switch (type) {
			case 'LOAD_CRYPTO':
				console.log(`[WASMWorker] Processing LOAD_CRYPTO with ID: ${id}`);
				await wasmManager.loadCrypto();
				console.log(`[WASMWorker] LOAD_CRYPTO completed, sending response for ID: ${id}`);
				self.postMessage({
					type: 'RESPONSE',
					id,
					success: true,
					result: { loaded: true }
				});
				break;

			case 'LOAD_DID':
				console.log(`[WASMWorker] Processing LOAD_DID with ID: ${id}`);
				await wasmManager.loadDID();
				console.log(`[WASMWorker] LOAD_DID completed, sending response for ID: ${id}`);
				self.postMessage({
					type: 'RESPONSE',
					id,
					success: true,
					result: { loaded: true }
				});
				break;

			case 'EXECUTE_WASM_FUNCTION':
				const { functionName, args } = payload;
				const result = await wasmManager.executeWASMFunction(functionName, args);
				self.postMessage({
					type: 'RESPONSE',
					id,
					success: result.success,
					result: result.success ? result.result : undefined,
					error: result.success ? undefined : result.error
				});
				break;

			case 'GET_STATUS':
				self.postMessage({
					type: 'RESPONSE',
					id,
					success: true,
					result: wasmManager.getStatus()
				});
				break;

			case 'PING':
				self.postMessage({
					type: 'RESPONSE',
					id,
					success: true,
					result: { pong: true, timestamp: Date.now() }
				});
				break;

			default:
				self.postMessage({
					type: 'RESPONSE',
					id,
					success: false,
					error: `Unknown message type: ${type}`
				});
		}
	} catch (error) {
		self.postMessage({
			type: 'RESPONSE',
			id,
			success: false,
			error: error.message
		});
	}
});

// Send ready signal after a small delay to ensure client event listeners are set up
setTimeout(() => {
	console.log('[WASMWorker] Sending WORKER_READY signal');
	self.postMessage({
		type: 'WORKER_READY',
		success: true,
		message: 'WASM Worker initialized and ready'
	});
}, 10); // Small delay to ensure client-side event listeners are ready