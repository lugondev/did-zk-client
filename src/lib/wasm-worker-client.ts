// Web Worker client for communicating with the WASM worker
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

export class WASMWorkerClient {
	private worker: Worker | null = null;
	private messageId = 0;
	private pendingPromises = new Map<string, { resolve: Function; reject: Function }>();
	private isReady = false;
	private initPromise: Promise<void> | null = null;

	constructor() {
		// Don't initialize worker in constructor - use lazy initialization
	}

	private async initializeWorker(retryCount = 0): Promise<void> {
		const maxRetries = 2;

		return new Promise(async (resolve, reject) => {
			try {
				console.log(`[WASMWorkerClient] Starting worker initialization... (attempt ${retryCount + 1}/${maxRetries + 1})`);

				// Set up timeout for worker initialization
				const timeout = setTimeout(() => {
					console.error(`[WASMWorkerClient] Worker initialization timeout after 10 seconds (attempt ${retryCount + 1})`);

					if (retryCount < maxRetries) {
						console.log(`[WASMWorkerClient] Retrying worker initialization (${retryCount + 1}/${maxRetries})`);
						// Cleanup and retry
						if (this.worker) {
							this.worker.terminate();
							this.worker = null;
						}
						this.initializeWorker(retryCount + 1).then(resolve).catch(reject);
					} else {
						reject(new Error('Worker initialization timeout after all retry attempts'));
					}
				}, 10000); // 10 second timeout

				// Listen for worker ready signal - set up before creating worker
				const readyHandler = (event: MessageEvent) => {
					console.log('[WASMWorkerClient] Received message:', event.data);
					const { type, success } = event.data;
					if (type === 'WORKER_READY' && success) {
						console.log('[WASMWorkerClient] Worker ready signal received');
						this.isReady = true;
						clearTimeout(timeout);
						this.worker?.removeEventListener('message', readyHandler);
						resolve();
					}
				};

				// Use dynamic worker creation to avoid static analysis issues
				console.log('[WASMWorkerClient] Creating worker instance...');
				this.worker = await createWASMWorker();
				console.log('[WASMWorkerClient] Worker instance created');

				// Set up event listeners immediately after worker creation
				this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));
				this.worker.addEventListener('message', readyHandler);
				this.worker.addEventListener('error', (error) => {
					console.error('[WASMWorkerClient] Worker error:', error);
					clearTimeout(timeout);
					reject(new Error(`Worker error: ${error.message}`));
				});

				console.log('[WASMWorkerClient] Event listeners set up, waiting for ready signal...');

			} catch (error) {
				console.error('[WASMWorkerClient] Error during initialization:', error);
				reject(error);
			}
		});
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
			this.pendingPromises.set(id, { resolve, reject });

			console.log(`[WASMWorkerClient] Sending message: ${type} with ID: ${id}`);

			// Set up timeout for the message
			const timeout = setTimeout(() => {
				if (this.pendingPromises.has(id)) {
					this.pendingPromises.delete(id);
					console.error(`[WASMWorkerClient] Message timeout: ${type} with ID: ${id} after 60 seconds`);
					console.error(`[WASMWorkerClient] Worker state: ready=${this.isReady}, worker=${!!this.worker}`);
					console.error(`[WASMWorkerClient] Pending promises count: ${this.pendingPromises.size}`);
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
}

// Export singleton instance
export const wasmWorkerClient = new WASMWorkerClient();