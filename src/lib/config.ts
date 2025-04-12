interface Config {
	apiUrl: string;
	auth: {
		cookieName: string;
		cookieMaxAge: number;
	};
	did: {
		pollingInterval: number;
		qrSize: number;
	};
}

const config: Config = {
	apiUrl: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/api',
	auth: {
		cookieName: process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || 'auth_token',
		cookieMaxAge: parseInt(process.env.NEXT_PUBLIC_AUTH_COOKIE_MAX_AGE || '86400', 10),
	},
	did: {
		pollingInterval: parseInt(process.env.NEXT_PUBLIC_DID_POLLING_INTERVAL || '2000', 10),
		qrSize: parseInt(process.env.NEXT_PUBLIC_DID_QR_SIZE || '256', 10),
	},
};

export default config;

// Helper functions to build API URLs
export function buildApiUrl(path: string): string {
	const baseUrl = config.apiUrl.endsWith('/') ? config.apiUrl.slice(0, -1) : config.apiUrl;
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${baseUrl}${normalizedPath}`;
}

// Helper function to get the cookie name
export function getAuthCookieName(): string {
	return config.auth.cookieName;
}

// Helper function to get cookie max age
export function getAuthCookieMaxAge(): number {
	return config.auth.cookieMaxAge;
}

// Helper function to get DID polling interval
export function getDidPollingInterval(): number {
	return config.did.pollingInterval;
}

// Helper function to get QR code size
export function getDidQrSize(): number {
	return config.did.qrSize;
}

// Helper functions for cookie management
export function setCookie(name: string, value: string, maxAge: number): void {
	document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=strict`;
}

export function getCookie(name: string): string | null {
	const cookies = document.cookie.split(';');
	for (let cookie of cookies) {
		const [key, value] = cookie.split('=').map(part => part.trim());
		if (key === name) {
			return value;
		}
	}
	return null;
}

export function deleteCookie(name: string): void {
	document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
