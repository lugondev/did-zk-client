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

class WASMLoader {
	private cryptoLoaded = false;
	private didLoaded = false;
	private loadingPromises: { [key: string]: Promise<void> } = {};
	private useWebWorker = false; // Flag to enable/disable Web Worker usage - disabled by default for reliability
	private readonly LARGE_WASM_THRESHOLD = 15 * 1024 * 1024; // 15MB threshold for auto-fallback

	constructor() {
		// Initialize with Web Worker enabled, check will happen when needed
		this.useWebWorker = true;
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

	async loadCrypto(): Promise<void> {
		if (this.cryptoLoaded) return;

		// Atomic check and set for the loading promise to prevent race conditions
		if (!this.loadingPromises.crypto) {
			this.loadingPromises.crypto = this._loadCryptoInternal();
		}

		return this.loadingPromises.crypto;
	}

	private async _loadCryptoInternal(): Promise<void> {
		try {
			// Check Web Worker support and file size
			const webWorkerSupported = this.useWebWorker && this.checkWebWorkerSupport();
			const shouldUseFallback = await this.shouldUseMainThreadForFile('/crypto.wasm');
			const useWorker = webWorkerSupported && !shouldUseFallback;

			if (shouldUseFallback) {
				console.log('Large Crypto WASM file detected, using main thread for better reliability');
			}

			if (useWorker) {
				console.log('Loading Crypto WASM module via Web Worker');
				try {
					await wasmWorkerClient.loadCrypto();
					this.cryptoLoaded = true;
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

					await this.loadWASMModuleMainThread('/crypto.wasm', 'wasmCryptoReady');
					this.cryptoLoaded = true;
					console.log('Crypto WASM module loaded successfully on main thread (fallback)');
				}
			} else {
				console.log('Loading Crypto WASM module on main thread');
				await this.loadWASMModuleMainThread('/crypto.wasm', 'wasmCryptoReady');
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

	async loadDID(): Promise<void> {
		if (this.didLoaded) return;

		// Atomic check and set for the loading promise to prevent race conditions
		if (!this.loadingPromises.did) {
			this.loadingPromises.did = this._loadDIDInternal();
		}

		return this.loadingPromises.did;
	}

	private async _loadDIDInternal(): Promise<void> {
		try {
			// Check Web Worker support and file size
			const webWorkerSupported = this.useWebWorker && this.checkWebWorkerSupport();
			const shouldUseFallback = await this.shouldUseMainThreadForFile('/did.wasm');
			const useWorker = webWorkerSupported && !shouldUseFallback;

			if (shouldUseFallback) {
				console.log('Large DID WASM file detected, using main thread for better reliability');
			}

			if (useWorker) {
				console.log('Loading DID WASM module via Web Worker');
				try {
					await wasmWorkerClient.loadDID();
					this.didLoaded = true;
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

					await this.loadWASMModuleMainThread('/did.wasm', 'wasmDIDReady');
					this.didLoaded = true;
					console.log('DID WASM module loaded successfully on main thread (fallback)');
				}
			} else {
				console.log('Loading DID WASM module on main thread');
				await this.loadWASMModuleMainThread('/did.wasm', 'wasmDIDReady');
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

	// Fallback method for main thread loading (original implementation)
	private async loadWASMModuleMainThread(wasmPath: string, readyFlag: string): Promise<void> {
		return new Promise((resolve, reject) => {
			// Add timeout for the entire loading process
			const loadingTimeout = setTimeout(() => {
				reject(new Error(`WASM module loading timeout for ${wasmPath} after 30 seconds`));
			}, 30000); // 30 second timeout

			const wrappedResolve = () => {
				clearTimeout(loadingTimeout);
				resolve();
			};

			const wrappedReject = (error: Error) => {
				clearTimeout(loadingTimeout);
				reject(error);
			};

			// Load wasm_exec.js if not already loaded
			if (!window.Go) {
				const script = document.createElement('script');
				script.src = '/wasm_exec.js';
				script.onload = () => this.loadWASMFileMainThread(wasmPath, readyFlag, wrappedResolve, wrappedReject);
				script.onerror = () => wrappedReject(new Error('Failed to load wasm_exec.js'));
				document.head.appendChild(script);
			} else {
				this.loadWASMFileMainThread(wasmPath, readyFlag, wrappedResolve, wrappedReject);
			}
		});
	}

	private loadWASMFileMainThread(wasmPath: string, readyFlag: string, resolve: () => void, reject: (error: Error) => void): void {
		try {
			const go = new window.Go();
			let readyCheckTimeout: NodeJS.Timeout | number | undefined;
			let hasResolved = false;

			// Reset the ready flag to ensure clean state
			(window as any)[readyFlag] = false;

			// Set up a timeout to check for readiness with better error handling
			const checkReady = () => {
				if (hasResolved) return; // Prevent multiple resolves

				if ((window as any)[readyFlag]) {
					hasResolved = true;
					if (readyCheckTimeout) {
						clearTimeout(readyCheckTimeout);
					}
					console.log(`[WASMLoader] ${readyFlag} is ready`);
					resolve();
				} else {
					readyCheckTimeout = setTimeout(checkReady, 100);
				}
			};

			// Add a safety timeout for the ready check
			const safetyTimeout = setTimeout(() => {
				if (!hasResolved) {
					hasResolved = true;
					if (readyCheckTimeout) {
						clearTimeout(readyCheckTimeout);
					}
					reject(new Error(`WASM module ${wasmPath} failed to signal ready within timeout`));
				}
			}, 25000); // 25 second timeout for ready signal

			// Load WASM with fallback for different browsers
			const loadWasm = async () => {
				try {
					let result;

					console.log(`[WASMLoader] Starting to load WASM module: ${wasmPath}`);

					if (typeof WebAssembly.instantiateStreaming === 'function') {
						// Modern browsers with streaming support
						console.log(`[WASMLoader] Using streaming instantiation for ${wasmPath}`);
						result = await WebAssembly.instantiateStreaming(fetch(wasmPath), go.importObject);
					} else {
						// Fallback for older browsers
						console.log(`[WASMLoader] Using fallback instantiation for ${wasmPath}`);
						const response = await fetch(wasmPath);
						if (!response.ok) {
							throw new Error(`Failed to fetch WASM module: ${response.status} ${response.statusText}`);
						}
						const wasmArrayBuffer = await response.arrayBuffer();
						result = await WebAssembly.instantiate(wasmArrayBuffer, go.importObject);
					}

					console.log(`[WASMLoader] WASM module instantiated successfully: ${wasmPath}`);

					// Run the WASM module in a try-catch to handle Go runtime errors
					try {
						go.run(result.instance);
						console.log(`[WASMLoader] WASM module started successfully: ${wasmPath}`);
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