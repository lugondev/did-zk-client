import { buildApiUrl } from '@/lib/config'

export interface DID {
	ID: string;
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
		const response = await fetch(buildApiUrl('/did/authenticate'), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				did_id: didId,
				private_key: privateKey,
				challenge: challenge,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.message || 'DID authentication failed');
		}

		const result = await response.json();
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

// Generate QR code challenge for mobile wallet authentication
export async function generateQRChallenge(): Promise<{ challenge: string; qrData: string }> {
	try {
		const response = await fetch(buildApiUrl('/did/qr-challenge'), {
			method: 'POST',
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
		const response = await fetch(buildApiUrl('/did/create'), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(formData),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.message || 'Failed to create DID');
		}

		return await response.json();
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
		const response = await fetch(buildApiUrl('/did/verify'), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				did_id: didId,
				signature,
				proof,
			}),
		});

		if (!response.ok) {
			throw new Error('Verification failed');
		}

		const result = await response.json();
		return result.verified;
	} catch (error) {
		throw new Error('Failed to verify DID');
	}
}
