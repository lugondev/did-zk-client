// Cryptographic utilities using WASM instead of JavaScript libraries
import { wasmLoader, type KeyPair } from './wasm-loader';
import { wasmWorkerClient } from './wasm-worker-client';

export interface CryptoKeyPair {
	privateKey: Uint8Array;
	publicKey: Uint8Array;
}

export interface SignatureData {
	signature: Uint8Array;
}

export interface VerificationResult {
	verified: boolean;
}

export class CryptoWASM {
	/**
	 * Generate a new key pair using WASM crypto module
	 */
	async generateKeyPair(): Promise<CryptoKeyPair> {
		try {
			const result = await wasmLoader.generateKeyPair();
			return {
				privateKey: this.hexToUint8Array(result.privateKey),
				publicKey: this.hexToUint8Array(result.publicKey),
			};
		} catch (error) {
			throw new Error(`Failed to generate key pair: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Sign a message using a private key
	 */
	async signMessage(privateKey: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
		try {
			// Validate inputs
			if (!privateKey || privateKey.length === 0) {
				throw new Error('Private key cannot be empty');
			}
			if (!message || message.length === 0) {
				throw new Error('Message cannot be empty');
			}

			// Convert private key to hex (ensure proper format)
			const privateKeyHex = this.uint8ArrayToHex(privateKey);
			if (!this.isValidHex(privateKeyHex)) {
				throw new Error('Invalid private key format');
			}

			// Convert message to hex string instead of using TextDecoder
			// This ensures binary data is correctly handled
			const messageHex = this.uint8ArrayToHex(message);

			// Validate message size
			if (message.length > 1024 * 1024) { // 1MB limit
				throw new Error('Message too large (max 1MB)');
			}

			const result = await wasmLoader.signMessage(privateKeyHex, messageHex);

			if (!result || !result.signature) {
				throw new Error('Invalid signature response from WASM module');
			}

			return this.hexToUint8Array(result.signature);
		} catch (error) {
			// Improve error handling to parse JSON error responses
			let errorMessage = 'Unknown error';
			if (error instanceof Error) {
				errorMessage = error.message;
				// Try to parse JSON error response from WASM module
				try {
					const parsedError = JSON.parse(error.message);
					if (parsedError.error) {
						errorMessage = parsedError.error;
					}
				} catch {
					// Not a JSON error, use the original message
				}
			}
			throw new Error(`Failed to sign message: ${errorMessage}`);
		}
	}

	/**
	 * Verify a signature using a public key
	 */
	async verifySignature(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
		try {
			// Validate inputs
			if (!publicKey || publicKey.length === 0) {
				throw new Error('Public key cannot be empty');
			}
			if (!message || message.length === 0) {
				throw new Error('Message cannot be empty');
			}
			if (!signature || signature.length === 0) {
				throw new Error('Signature cannot be empty');
			}

			const publicKeyHex = this.uint8ArrayToHex(publicKey);
			// Use hex encoding for message to match signing process
			const messageHex = this.uint8ArrayToHex(message);
			const signatureHex = this.uint8ArrayToHex(signature);

			const result = await wasmLoader.verifySignature(publicKeyHex, messageHex, signatureHex);
			return result.verified;
		} catch (error) {
			// Improve error handling to parse JSON error responses
			let errorMessage = 'Unknown error';
			if (error instanceof Error) {
				errorMessage = error.message;
				try {
					const parsedError = JSON.parse(error.message);
					if (parsedError.error) {
						errorMessage = parsedError.error;
					}
				} catch {
					// Not a JSON error, use the original message
				}
			}
			throw new Error(`Failed to verify signature: ${errorMessage}`);
		}
	}

	/**
	 * Generate a random big integer
	 */
	async generateRandomValue(): Promise<Uint8Array> {
		try {
			const result = await wasmLoader.generateRandomBigInt();
			return this.hexToUint8Array(result.value);
		} catch (error) {
			throw new Error(`Failed to generate random value: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Hash a message using WASM crypto
	 */
	async hashMessage(message: Uint8Array): Promise<Uint8Array> {
		try {
			// Validate input
			if (!message || message.length === 0) {
				throw new Error('Message cannot be empty');
			}

			// Use hex encoding for message to ensure binary data is handled correctly
			const messageHex = this.uint8ArrayToHex(message);
			const result = await wasmLoader.hashMessage(messageHex);
			return this.hexToUint8Array(result.hash);
		} catch (error) {
			// Improve error handling to parse JSON error responses
			let errorMessage = 'Unknown error';
			if (error instanceof Error) {
				errorMessage = error.message;
				try {
					const parsedError = JSON.parse(error.message);
					if (parsedError.error) {
						errorMessage = parsedError.error;
					}
				} catch {
					// Not a JSON error, use the original message
				}
			}
			throw new Error(`Failed to hash message: ${errorMessage}`);
		}
	}

	/**
	 * Generate a random challenge string
	 */
	async generateChallenge(length: number = 32): Promise<Uint8Array> {
		try {
			const randomValue = await this.generateRandomValue();
			// Return the first `length` bytes or all bytes if shorter
			return randomValue.subarray(0, Math.min(length, randomValue.length));
		} catch (error) {
			throw new Error(`Failed to generate challenge: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get Web Worker status for debugging
	 */
	async getWorkerStatus() {
		return await wasmLoader.getWorkerStatus();
	}

	/**
	 * Ping the Web Worker to check responsiveness
	 */
	async pingWorker() {
		return await wasmLoader.pingWorker();
	}

	/**
	 * Check if using Web Worker
	 */
	get isUsingWebWorker(): boolean {
		return wasmLoader.isUsingWebWorker;
	}

	/**
	 * Convert hex string to Uint8Array (utility function)
	 */
	hexToUint8Array(hex: string): Uint8Array {
		// Remove '0x' prefix if present
		const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
		const bytes = new Uint8Array(cleanHex.length / 2);
		for (let i = 0; i < cleanHex.length; i += 2) {
			bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
		}
		return bytes;
	}

	/**
	 * Convert Uint8Array to hex string (utility function)
	 */
	uint8ArrayToHex(bytes: Uint8Array): string {
		return Array.from(bytes)
			.map(byte => byte.toString(16).padStart(2, '0'))
			.join('');
	}

	/**
	 * Validate if a string is a valid hex string
	 */
	isValidHex(hex: string): boolean {
		if (!hex || hex.length === 0) return false;
		// Remove '0x' prefix if present
		const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
		// Must be even length and contain only hex characters
		return cleanHex.length > 0 && cleanHex.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(cleanHex);
	}

	/**
	 * Convert string to hex encoding
	 */
	stringToHex(str: string): string {
		return Array.from(new TextEncoder().encode(str))
			.map(byte => byte.toString(16).padStart(2, '0'))
			.join('');
	}

	/**
	 * Convert hex to string
	 */
	hexToString(hex: string): string {
		const bytes = this.hexToUint8Array(hex);
		return new TextDecoder().decode(bytes);
	}

	/**
	 * Convert string to Uint8Array
	 */
	stringToUint8Array(str: string): Uint8Array {
		return new TextEncoder().encode(str);
	}

	/**
	 * Convert Uint8Array to string
	 */
	uint8ArrayToString(bytes: Uint8Array): string {
		return new TextDecoder().decode(bytes);
	}
}

// Export singleton instance
export const cryptoWasm = new CryptoWASM();

// Legacy compatibility - replace tweetnacl usage (with string conversion)
export const generateKeyPair = async () => {
	const result = await cryptoWasm.generateKeyPair();
	return {
		privateKey: cryptoWasm.uint8ArrayToHex(result.privateKey),
		publicKey: cryptoWasm.uint8ArrayToHex(result.publicKey),
	};
};

export const sign = async (privateKey: string, message: string) => {
	// Validate inputs
	if (!privateKey || !cryptoWasm.isValidHex(privateKey)) {
		throw new Error('Invalid private key format (must be hex)');
	}
	if (!message) {
		throw new Error('Message cannot be empty');
	}

	const privateKeyBytes = cryptoWasm.hexToUint8Array(privateKey);
	const messageBytes = cryptoWasm.stringToUint8Array(message);
	const signature = await cryptoWasm.signMessage(privateKeyBytes, messageBytes);
	return cryptoWasm.uint8ArrayToHex(signature);
};

export const verify = async (publicKey: string, message: string, signature: string) => {
	// Validate inputs
	if (!publicKey || !cryptoWasm.isValidHex(publicKey)) {
		throw new Error('Invalid public key format (must be hex)');
	}
	if (!message) {
		throw new Error('Message cannot be empty');
	}
	if (!signature || !cryptoWasm.isValidHex(signature)) {
		throw new Error('Invalid signature format (must be hex)');
	}

	const publicKeyBytes = cryptoWasm.hexToUint8Array(publicKey);
	const messageBytes = cryptoWasm.stringToUint8Array(message);
	const signatureBytes = cryptoWasm.hexToUint8Array(signature);
	return await cryptoWasm.verifySignature(publicKeyBytes, messageBytes, signatureBytes);
};

export const randomBytes = async (length: number) => {
	const bytes = await cryptoWasm.generateChallenge(length);
	return cryptoWasm.uint8ArrayToHex(bytes);
};

export const hash = async (message: string) => {
	const messageBytes = cryptoWasm.stringToUint8Array(message);
	const hashBytes = await cryptoWasm.hashMessage(messageBytes);
	return cryptoWasm.uint8ArrayToHex(hashBytes);
};