// Enhanced Web Worker client with dynamic import support for Next.js
// This version addresses the TP1001 static analysis error by using dynamic imports

import { createWASMWorker, terminateWASMWorker } from './worker-factory';

export interface WASMWorkerResponse {
	type: string;
	id?: string;
	success: boolean;
	result?: any;
	error?: string;
	message?: string;
}

export interface WASMStatus {
	cryptoLoaded: boolean;
	didLoaded: boolean;
	cryptoReady: boolean;
	didReady: boolean;
}

export class EnhancedWASMWorkerClient {
	private worker: Worker | null = null;
	private messageId = 0;
	private pendingPromises = new Map<string, { resolve: Function; reject: Function }>();
	private isReady = false;
	private initPromise: Promise<void> | null = null;
	private isClient = false;

	constructor() {
		// Check if we're running in the browser
		this.isClient = typeof window !== 'undefined';
	}

	/**
	 * Initialize worker using dynamic import pattern
	 */
	private async initializeWorker(): Promise<void> {
		// Only initialize in browser environment
		if (!this.isClient) {
			throw new Error('Worker can only be initialized in browser environment');
		}

		return new Promise(async (resolve, reject) => {
			try {
				// Dynamic worker creation with retry logic
				this.worker = await this.createWorkerWithRetry();

				this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));
				this.worker.addEventListener('error', (error) => {
					console.error('WASM Worker error:', error);
					reject(new Error(`Worker error: ${error.message}`));
				});

				// Set up timeout for worker initialization
				const timeout = setTimeout(() => {
					reject(new Error('Worker initialization timeout'));
				}, 10000); // 10 second timeout

				// Listen for worker ready signal
				const readyHandler = (event: MessageEvent) => {
					const { type, success } = event.data;
					if (type === 'WORKER_READY' && success) {
						this.isReady = true;
						clearTimeout(timeout);
						this.worker?.removeEventListener('message', readyHandler);
						resolve();
					}
				};

				this.worker.addEventListener('message', readyHandler);
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Create worker with retry logic and fallback options
	 */
	private async createWorkerWithRetry(maxRetries = 3): Promise<Worker> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				return await createWASMWorker();
			} catch (error) {
				lastError = error instanceof Error ? error : new Error('Unknown worker creation error');
				console.warn(`Worker creation attempt ${attempt} failed:`, lastError.message);

				if (attempt < maxRetries) {
					// Wait before retry
					await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
				}
			}
		}

		throw lastError || new Error('Failed to create worker after retries');
	}

	private handleWorkerMessage(event: MessageEvent) {
		const response: WASMWorkerResponse = event.data;

		// Handle specific message types
		switch (response.type) {
			case 'CRYPTO_LOADED':
			case 'DID_LOADED':
				console.log(response.success ? response.message : `Error: ${response.error}`);
				break;

			case 'RESPONSE':
				if (response.id) {
					const pending = this.pendingPromises.get(response.id);
					if (pending) {
						this.pendingPromises.delete(response.id);
						if (response.success) {
							pending.resolve(response.result);
						} else {
							pending.reject(new Error(response.error || 'Unknown worker error'));
						}
					}
				}
				break;

			default:
				// Handle other message types if needed
				break;
		}
	}

	private async sendMessage(type: string, payload?: any): Promise<any> {
		await this.ensureReady();

		return new Promise((resolve, reject) => {
			if (!this.worker) {
				reject(new Error('Worker not initialized'));
				return;
			}

			const id = (this.messageId++).toString();
			console.log(`[EnhancedWASMWorkerClient] Sending message: ${type} with ID: ${id}`);

			// Set up timeout for the message
			const timeout = setTimeout(() => {
				if (this.pendingPromises.has(id)) {
					this.pendingPromises.delete(id);
					console.error(`[EnhancedWASMWorkerClient] Message timeout: ${type} with ID: ${id} after 60 seconds`);
					console.error(`[EnhancedWASMWorkerClient] Worker state: ready=${this.isReady}, worker=${!!this.worker}`);
					console.error(`[EnhancedWASMWorkerClient] Pending promises count: ${this.pendingPromises.size}`);
					reject(new Error(`Worker message timeout for ${type} after 60 seconds`));
				}
			}, 60000); // 60 second timeout for WASM operations (large WASM files need more time)

			// Store timeout reference for cleanup
			this.pendingPromises.set(id, {
				resolve: (result: any) => {
					clearTimeout(timeout);
					resolve(result);
				},
				reject: (error: any) => {
					clearTimeout(timeout);
					reject(error);
				}
			});

			this.worker.postMessage({ type, id, payload });
		});
	}

	private async ensureReady(): Promise<void> {
		// Only proceed if in browser environment
		if (!this.isClient) {
			throw new Error('Worker operations are only available in browser environment');
		}

		// Atomic check and set for the initialization promise to prevent race conditions
		if (!this.initPromise) {
			this.initPromise = this.initializeWorker();
		}

		try {
			await this.initPromise;
			if (!this.isReady) {
				throw new Error('Worker initialization completed but worker is not ready');
			}
		} catch (error) {
			// Clear the init promise on failure to allow retry
			this.initPromise = null;
			this.isReady = false;
			throw error;
		}
	}

	/**
	 * Load the crypto WASM module
	 */
	async loadCrypto(): Promise<void> {
		await this.sendMessage('LOAD_CRYPTO');
	}

	/**
	 * Load the DID WASM module
	 */
	async loadDID(): Promise<void> {
		await this.sendMessage('LOAD_DID');
	}

	/**
	 * Execute a WASM function in the worker
	 */
	async executeWASMFunction(functionName: string, args: any[] = []): Promise<any> {
		return await this.sendMessage('EXECUTE_WASM_FUNCTION', { functionName, args });
	}

	/**
	 * Get the current status of WASM modules
	 */
	async getStatus(): Promise<WASMStatus> {
		return await this.sendMessage('GET_STATUS');
	}

	/**
	 * Ping the worker to check if it's responsive
	 */
	async ping(): Promise<{ pong: boolean; timestamp: number }> {
		return await this.sendMessage('PING');
	}

	/**
	 * Terminate the worker
	 */
	terminate(): void {
		if (this.worker) {
			// Use the worker factory's terminate function
			terminateWASMWorker();
			this.worker = null;
			this.isReady = false;
			this.initPromise = null;
			this.pendingPromises.clear();
		}
	}

	/**
	 * Check if the worker is ready
	 */
	get ready(): boolean {
		return this.isReady;
	}

	/**
	 * Check if running in client environment
	 */
	get isClientSide(): boolean {
		return this.isClient;
	}
}

// Export singleton instance with lazy initialization
let clientInstance: EnhancedWASMWorkerClient | null = null;

export function getWASMWorkerClient(): EnhancedWASMWorkerClient {
	if (!clientInstance) {
		clientInstance = new EnhancedWASMWorkerClient();
	}
	return clientInstance;
}

// Export the singleton instance
export const enhancedWasmWorkerClient = getWASMWorkerClient();