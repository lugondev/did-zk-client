import { buildApiUrl } from '@/lib/config'
import { wasmLoader } from '@/lib/wasm-loader'
import { cryptoWasm } from '@/lib/crypto-wasm'

export interface DID {
	ID: string;
	PublicKey?: string;
	Document?: any;
}

type AuthenticateResult = {
	proof: string;
	signature: string;
};

export async function authenticateDID(
	didId: string,
	privateKey: string,
	challenge: string
): Promise<AuthenticateResult> {
	try {
		// Use WASM instead of API call
		const result = await wasmLoader.authenticateDID(didId, privateKey, challenge);
		return {
			proof: result.proof,
			signature: result.signature,
		};
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Failed to authenticate DID');
	}
}

// Binary version of authenticate DID for optimized data transfer
export async function authenticateDIDBinary(
	didId: string,
	privateKey: Uint8Array,
	challenge: Uint8Array
): Promise<{
	proof: string;
	signature: Uint8Array;
}> {
	try {
		// Convert binary data to hex for WASM call
		const privateKeyHex = cryptoWasm.uint8ArrayToHex(privateKey);
		const challengeHex = cryptoWasm.uint8ArrayToHex(challenge);

		// Use WASM instead of API call
		const result = await wasmLoader.authenticateDID(didId, privateKeyHex, challengeHex);
		return {
			proof: result.proof,
			signature: cryptoWasm.hexToUint8Array(result.signature),
		};
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Failed to authenticate DID with binary encoding');
	}
}

// Generate QR code challenge for mobile wallet authentication
export async function generateQRChallenge(): Promise<{ challenge: string; qrData: string }> {
	try {
		const response = await fetch(buildApiUrl('/did/qr-challenge'), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				didId: 'did:example:123123123',
			}),
		});

		if (!response.ok) {
			throw new Error('Failed to generate QR challenge');
		}

		const data = await response.json();
		return {
			challenge: data.challenge,
			qrData: data.qr_data,
		};
	} catch (error) {
		throw new Error('Failed to generate QR challenge');
	}
}

// Poll for QR code authentication status
export async function pollQRAuthentication(challenge: string): Promise<{ authenticated: boolean; didId?: string }> {
	try {
		const response = await fetch(
			buildApiUrl(`/did/qr-status?challenge=${challenge}`),
			{
				method: 'GET',
			}
		);

		if (!response.ok) {
			throw new Error('Failed to check QR authentication status');
		}

		const data = await response.json();
		return {
			authenticated: data.authenticated,
			didId: data.did_id,
		};
	} catch (error) {
		throw new Error('Failed to check QR authentication status');
	}
}

export async function createDID(formData: { name: string; dob: string }) {
	try {
		// Use WASM instead of API call
		const result = await wasmLoader.createDID();

		// Transform the WASM result to match the expected format
		return {
			did: {
				ID: result.did.id,
				PublicKey: result.did.publicKey,
				Document: result.did.document,
			},
			privateKey: result.privateKey,
		};
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Failed to create DID');
	}
}

export async function verifyDID(
	didId: string,
	signature: string,
	proof: string
): Promise<boolean> {
	try {
		// Use WASM instead of API call
		const result = await wasmLoader.verifyAuthentication(didId, proof, signature);
		return result.verified;
	} catch (error) {
		throw new Error('Failed to verify DID');
	}
}

// Binary version of verify DID for optimized data transfer
export async function verifyDIDBinary(
	didId: string,
	signature: Uint8Array,
	proof: string
): Promise<boolean> {
	try {
		// Convert binary signature to hex for WASM call
		const signatureHex = cryptoWasm.uint8ArrayToHex(signature);

		// Use WASM instead of API call
		const result = await wasmLoader.verifyAuthentication(didId, proof, signatureHex);
		return result.verified;
	} catch (error) {
		throw new Error('Failed to verify DID with binary encoding');
	}
}

// Binary crypto helper functions for DID operations
export const DIDCrypto = {
	/**
	 * Generate a cryptographic challenge as binary data
	 */
	async generateChallengeBinary(length: number = 32): Promise<Uint8Array> {
		return await cryptoWasm.generateChallenge(length);
	},

	/**
	 * Generate a keypair with binary encoding
	 */
	async generateKeyPairBinary(): Promise<{
		privateKey: Uint8Array;
		publicKey: Uint8Array;
	}> {
		return await cryptoWasm.generateKeyPair();
	},

	/**
	 * Sign a message with binary data
	 */
	async signMessageBinary(privateKey: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
		return await cryptoWasm.signMessage(privateKey, message);
	},

	/**
	 * Verify a signature with binary data
	 */
	async verifySignatureBinary(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
		return await cryptoWasm.verifySignature(publicKey, message, signature);
	},

	/**
	 * Hash a message with binary encoding
	 */
	async hashMessageBinary(message: Uint8Array): Promise<Uint8Array> {
		return await cryptoWasm.hashMessage(message);
	},

	// Utility functions for conversion
	stringToUint8Array: (str: string) => cryptoWasm.stringToUint8Array(str),
	uint8ArrayToString: (bytes: Uint8Array) => cryptoWasm.uint8ArrayToString(bytes),
	hexToUint8Array: (hex: string) => cryptoWasm.hexToUint8Array(hex),
	uint8ArrayToHex: (bytes: Uint8Array) => cryptoWasm.uint8ArrayToHex(bytes),
};

// Batch Operations

export interface BatchCreateAndIssueRequest {
	name: string;
	dob: string;
}

export interface BatchCreateAndIssueResponse {
	did: DID;
	privateKey: string;
	success: boolean;
	message?: string;
}

export interface BatchAuthAndVerifyRequest {
	didId: string;
	privateKey: string;
	challenge: string;
}

export interface BatchAuthAndVerifyResponse {
	proof: string;
	signature: string;
	verified: boolean;
	success: boolean;
	message?: string;
}

// Batch: Create DID and issue credential in a single operation
export async function batchCreateDIDAndIssueCredential(
	formData: BatchCreateAndIssueRequest
): Promise<BatchCreateAndIssueResponse> {
	try {
		// Use WASM for DID creation
		const didResult = await wasmLoader.createDID();

		// Calculate age from date of birth
		const dob = new Date(formData.dob);
		const today = new Date();
		let age = today.getFullYear() - dob.getFullYear();
		const monthDiff = today.getMonth() - dob.getMonth();
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
			age--;
		}

		// Issue age credential using WASM
		const credentialResult = await wasmLoader.issueAgeCredential(didResult.did.id, age);

		return {
			did: {
				ID: didResult.did.id,
			},
			privateKey: didResult.privateKey,
			success: true,
			message: 'DID created and credential issued successfully',
		};
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Failed to create DID and issue credential');
	}
}

// Batch: Authenticate DID and verify in a single operation
export async function batchAuthenticateAndVerifyDID(
	request: BatchAuthAndVerifyRequest
): Promise<BatchAuthAndVerifyResponse> {
	try {
		// Authenticate using WASM
		const authResult = await wasmLoader.authenticateDID(
			request.didId,
			request.privateKey,
			request.challenge
		);

		// Verify using WASM
		const verifyResult = await wasmLoader.verifyAuthentication(
			request.didId,
			authResult.proof,
			authResult.signature
		);

		return {
			proof: authResult.proof,
			signature: authResult.signature,
			verified: verifyResult.verified,
			success: true,
			message: 'Authentication and verification completed successfully',
		};
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Failed to authenticate and verify DID');
	}
}

// Helper function to check if batching is beneficial
export function shouldUseBatching(): boolean {
	// You can add logic here to determine when to use batching
	// For example, based on network conditions, user preferences, etc.
	return true; // For now, always recommend batching
}
