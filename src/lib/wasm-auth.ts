// Enhanced client-side authentication using WASM crypto operations with Web Worker support
import { wasmLoader } from './wasm-loader';
import { cryptoWasm } from './crypto-wasm';
import { buildApiUrl, getAuthCookieName, getAuthCookieMaxAge, setCookie, deleteCookie } from './config';

export interface User {
	id: number;
	username: string;
	email?: string;
	did?: string;
	created_at: string;
	last_login_at?: string;
	last_updated_at?: string;
	is_two_factor_enabled: boolean;
}

export interface AuthResponse {
	token: string;
	user: User;
}

export interface ClientSideAuthData {
	username: string;
	password: string;
	clientSideHash?: string;
	publicKey?: string;
}

export interface DIDAuthData {
	didId: string;
	proof: string;
	signature: string;
	challenge: string;
	publicKey?: string;
}

export interface PasswordHashResult {
	hash: string;
	salt: string;
}

export class WASMAuth {
	/**
	 * Generate a secure password hash using WASM crypto
	 */
	async hashPassword(password: string, salt?: string): Promise<PasswordHashResult> {
		try {
			// Generate salt if not provided
			const saltBytes = salt ?
				cryptoWasm.hexToUint8Array(salt) :
				await cryptoWasm.generateChallenge(32);

			// Combine password and salt
			const passwordBytes = cryptoWasm.stringToUint8Array(password);
			const combined = new Uint8Array(passwordBytes.length + saltBytes.length);
			combined.set(passwordBytes);
			combined.set(saltBytes, passwordBytes.length);

			// Hash the combined data
			const hashBytes = await cryptoWasm.hashMessage(combined);

			return {
				hash: cryptoWasm.uint8ArrayToHex(hashBytes),
				salt: cryptoWasm.uint8ArrayToHex(saltBytes),
			};
		} catch (error) {
			throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Generate a keypair and derive a public key for authentication
	 */
	async generateAuthKeyPair(): Promise<{
		privateKey: string;
		publicKey: string;
		keyPair: { privateKey: Uint8Array; publicKey: Uint8Array };
	}> {
		try {
			const keyPair = await cryptoWasm.generateKeyPair();
			return {
				privateKey: cryptoWasm.uint8ArrayToHex(keyPair.privateKey),
				publicKey: cryptoWasm.uint8ArrayToHex(keyPair.publicKey),
				keyPair,
			};
		} catch (error) {
			throw new Error(`Failed to generate auth keypair: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Create a DID with full client-side crypto operations
	 */
	async createDIDClientSide(name: string, dob: string): Promise<{
		did: any;
		privateKey: string;
		credential: any;
		salt: string;
	}> {
		try {
			// Create DID using WASM
			const didResult = await wasmLoader.createDID();

			// Calculate age from date of birth
			const dobDate = new Date(dob);
			const today = new Date();
			let age = today.getFullYear() - dobDate.getFullYear();
			const monthDiff = today.getMonth() - dobDate.getMonth();
			if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
				age--;
			}

			// Issue age credential using WASM
			const credentialResult = await wasmLoader.issueAgeCredential(didResult.did.id, age);

			return {
				did: didResult.did,
				privateKey: didResult.privateKey,
				credential: credentialResult.credential,
				salt: credentialResult.salt,
			};
		} catch (error) {
			throw new Error(`Failed to create DID client-side: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Authenticate DID with full client-side verification
	 */
	async authenticateDIDClientSide(
		didId: string,
		privateKey: string,
		challenge: string
	): Promise<{
		proof: string;
		signature: string;
		verified: boolean;
	}> {
		try {
			// Authenticate using WASM
			const authResult = await wasmLoader.authenticateDID(didId, privateKey, challenge);

			// Verify the authentication immediately
			const verifyResult = await wasmLoader.verifyAuthentication(
				didId,
				authResult.proof,
				authResult.signature
			);

			return {
				proof: authResult.proof,
				signature: authResult.signature,
				verified: verifyResult.verified,
			};
		} catch (error) {
			throw new Error(`Failed to authenticate DID client-side: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Create membership and balance proof client-side
	 */
	async createMembershipProofClientSide(
		organizationId: string,
		balance: number,
		balanceRangeMin: number,
		balanceRangeMax: number
	): Promise<{
		proof: string;
		salt: string;
		commitment: string;
		organizationIdHash: string;
	}> {
		try {
			console.log('Creating membership proof client-side...', { organizationId, balance, balanceRangeMin, balanceRangeMax });

			// Generate salt for the proof
			const saltBytes = await cryptoWasm.generateChallenge(32);
			const salt = cryptoWasm.uint8ArrayToHex(saltBytes);
			console.log('Generated salt:', salt);

			// Ensure DID WASM module is loaded
			await wasmLoader.loadDID();
			console.log('DID WASM module loaded');

			// Check if function is available
			if (!wasmLoader.isUsingWebWorker && typeof window.createMembershipAndBalanceProof !== 'function') {
				throw new Error('createMembershipAndBalanceProof function not available on window object');
			}

			// Create the membership and balance proof
			console.log('Calling createMembershipAndBalanceProof...');
			const proofResult = await wasmLoader.createMembershipAndBalanceProof(
				organizationId,
				balance,
				balanceRangeMin,
				balanceRangeMax,
				salt
			);
			console.log('Proof result:', proofResult);

			// Create commitment and organization hash
			const orgIdBytes = cryptoWasm.stringToUint8Array(organizationId);
			const balanceBytes = new Uint8Array(4);
			new DataView(balanceBytes.buffer).setUint32(0, balance);

			// Hash organization ID
			const orgIdHash = await cryptoWasm.hashMessage(orgIdBytes);

			// Create commitment (hash of orgId + balance + salt)
			const commitmentData = new Uint8Array(orgIdBytes.length + balanceBytes.length + saltBytes.length);
			commitmentData.set(orgIdBytes);
			commitmentData.set(balanceBytes, orgIdBytes.length);
			commitmentData.set(saltBytes, orgIdBytes.length + balanceBytes.length);
			const commitment = await cryptoWasm.hashMessage(commitmentData);

			return {
				proof: proofResult.proof,
				salt,
				commitment: cryptoWasm.uint8ArrayToHex(commitment),
				organizationIdHash: cryptoWasm.uint8ArrayToHex(orgIdHash),
			};
		} catch (error) {
			throw new Error(`Failed to create membership proof client-side: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Sign data with client-side private key
	 */
	async signDataClientSide(privateKey: string, data: string): Promise<string> {
		try {
			const privateKeyBytes = cryptoWasm.hexToUint8Array(privateKey);
			const dataBytes = cryptoWasm.stringToUint8Array(data);
			const signature = await cryptoWasm.signMessage(privateKeyBytes, dataBytes);
			return cryptoWasm.uint8ArrayToHex(signature);
		} catch (error) {
			throw new Error(`Failed to sign data client-side: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Verify signature client-side
	 */
	async verifySignatureClientSide(publicKey: string, data: string, signature: string): Promise<boolean> {
		try {
			const publicKeyBytes = cryptoWasm.hexToUint8Array(publicKey);
			const dataBytes = cryptoWasm.stringToUint8Array(data);
			const signatureBytes = cryptoWasm.hexToUint8Array(signature);
			return await cryptoWasm.verifySignature(publicKeyBytes, dataBytes, signatureBytes);
		} catch (error) {
			throw new Error(`Failed to verify signature client-side: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Enhanced login that performs client-side crypto operations before contacting backend
	 */
	async loginWithClientSideCrypto(username: string, password: string): Promise<AuthResponse> {
		try {
			// Generate client-side password hash
			const { hash: passwordHash } = await this.hashPassword(password);

			// Generate authentication keypair
			const { publicKey } = await this.generateAuthKeyPair();

			// Create authentication data
			const authData: ClientSideAuthData = {
				username,
				password: '', // Don't send plain password
				clientSideHash: passwordHash,
				publicKey,
			};

			// Send to backend for verification (backend should verify client-side hash)
			const response = await fetch(buildApiUrl('/auth/login-enhanced'), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(authData),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Enhanced login failed');
			}

			const authResponse = await response.json();
			this.handleAuthSuccess(authResponse);
			return authResponse;
		} catch (error) {
			throw new Error(`Client-side crypto login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Enhanced DID login with full client-side verification
	 */
	async loginWithDIDClientSide(didId: string, privateKey: string): Promise<AuthResponse> {
		try {
			// Generate challenge client-side
			const challengeBytes = await cryptoWasm.generateChallenge(32);
			const challenge = cryptoWasm.uint8ArrayToHex(challengeBytes);

			// Authenticate and verify client-side
			const authResult = await this.authenticateDIDClientSide(didId, privateKey, challenge);

			if (!authResult.verified) {
				throw new Error('Client-side DID verification failed');
			}

			// Get public key for the DID
			const keyPair = await this.generateAuthKeyPair();

			const didAuthData: DIDAuthData = {
				didId,
				proof: authResult.proof,
				signature: authResult.signature,
				challenge,
				publicKey: keyPair.publicKey,
			};

			// Send verified data to backend
			const response = await fetch(buildApiUrl('/auth/login-did-enhanced'), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(didAuthData),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Enhanced DID login failed');
			}

			const authResponse = await response.json();
			this.handleAuthSuccess(authResponse);

			// Store DID settings
			if (authResponse.user?.did) {
				localStorage.setItem('did_settings', JSON.stringify({
					id: authResponse.user.did,
					enabled: true,
					lastAuthenticated: new Date().toISOString(),
				}));
			}

			return authResponse;
		} catch (error) {
			throw new Error(`Client-side DID login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Register with client-side crypto operations
	 */
	async registerWithClientSideCrypto(username: string, password: string): Promise<AuthResponse> {
		try {
			// Generate client-side password hash with salt
			const { hash: passwordHash, salt } = await this.hashPassword(password);

			// Generate authentication keypair
			const { publicKey } = await this.generateAuthKeyPair();

			const registrationData = {
				username,
				passwordHash,
				salt,
				publicKey,
			};

			const response = await fetch(buildApiUrl('/auth/register-enhanced'), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(registrationData),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Enhanced registration failed');
			}

			const authResponse = await response.json();
			this.handleAuthSuccess(authResponse);
			return authResponse;
		} catch (error) {
			throw new Error(`Client-side crypto registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Handle successful authentication
	 */
	private handleAuthSuccess(authResponse: AuthResponse): void {
		localStorage.setItem('auth_token', authResponse.token);
		setCookie(getAuthCookieName(), authResponse.token, getAuthCookieMaxAge());
		localStorage.setItem('user_data', JSON.stringify(authResponse.user));

		// Dispatch an event that can be caught by layout components
		const event = new CustomEvent('auth-success', { detail: authResponse });
		window.dispatchEvent(event);
	}

	/**
	 * Logout and clear all client-side data
	 */
	logout(): void {
		localStorage.removeItem('auth_token');
		deleteCookie(getAuthCookieName());
		localStorage.removeItem('user_data');
		localStorage.removeItem('did_settings');
		localStorage.removeItem('client_keypair');

		// Dispatch logout event
		window.dispatchEvent(new Event('auth-logout'));

		const event = new Event('auth-navigate', {
			bubbles: true,
			cancelable: true
		});
		window.dispatchEvent(event);
	}

	/**
	 * Get comprehensive WASM and Web Worker status for debugging
	 */
	async getSystemStatus(): Promise<{
		webWorkerSupported: boolean;
		usingWebWorker: boolean;
		workerStatus?: any;
		workerPing?: any;
		cryptoWasmStatus: any;
	}> {
		try {
			const webWorkerSupported = typeof Worker !== 'undefined';
			const usingWebWorker = wasmLoader.isUsingWebWorker;

			const status: any = {
				webWorkerSupported,
				usingWebWorker,
			};

			if (usingWebWorker) {
				try {
					status.workerStatus = await wasmLoader.getWorkerStatus();
					status.workerPing = await wasmLoader.pingWorker();
				} catch (error) {
					status.workerError = error instanceof Error ? error.message : 'Unknown worker error';
				}
			}

			status.cryptoWasmStatus = await cryptoWasm.getWorkerStatus();

			return status;
		} catch (error) {
			throw new Error(`Failed to get system status: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Force reload of WASM modules (useful for debugging)
	 */
	async reloadWASMModules(): Promise<void> {
		try {
			// Terminate current worker if using Web Worker
			if (wasmLoader.isUsingWebWorker) {
				wasmLoader.terminateWorker();
			}

			// Reset internal state
			(wasmLoader as any).cryptoLoaded = false;
			(wasmLoader as any).didLoaded = false;
			(wasmLoader as any).loadingPromises = {};

			console.log('WASM modules reset, ready for reload');
		} catch (error) {
			throw new Error(`Failed to reload WASM modules: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Preload both WASM modules for better performance
	 */
	async preloadWASMModules(): Promise<{
		cryptoLoaded: boolean;
		didLoaded: boolean;
		loadTime: number;
	}> {
		const startTime = Date.now();

		try {
			// Load both modules in parallel
			await Promise.all([
				wasmLoader.loadCrypto(),
				wasmLoader.loadDID()
			]);

			const loadTime = Date.now() - startTime;

			return {
				cryptoLoaded: true,
				didLoaded: true,
				loadTime
			};
		} catch (error) {
			const loadTime = Date.now() - startTime;
			console.error('Failed to preload WASM modules:', error);

			return {
				cryptoLoaded: false,
				didLoaded: false,
				loadTime
			};
		}
	}
}

// Export singleton instance
export const wasmAuth = new WASMAuth();

// Backwards compatibility exports
export { wasmAuth as enhancedAuth };