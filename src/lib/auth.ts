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

export interface LoginData {
	username: string;
	password: string;
}

export interface DIDLoginData {
	didId: string;
	challenge: string;
	signature: string;
	proof: string;
}

export interface UpdateProfileData {
	username?: string;
	email?: string;
}

export interface UpdateSecurityData {
	enable_two_factor: boolean;
}

export interface UpdatePasswordData {
	current_password: string;
	new_password: string;
}

export interface UpdateDIDSettingsData {
	didId: string;
	enabled: boolean;
}

// Update DID settings
export async function updateDIDSettings(data: UpdateDIDSettingsData): Promise<void> {
	const settings = {
		id: data.didId,
		enabled: data.enabled,
		lastAuthenticated: new Date().toISOString(),
	};
	localStorage.setItem('did_settings', JSON.stringify(settings));

	// Update user data with new DID
	const userData = getUserData();
	if (userData) {
		userData.did = data.enabled ? data.didId : undefined;
		setUserData(userData);
	}
}

// Store auth token in localStorage and sync with cookies
export function setToken(token: string): void {
	localStorage.setItem('auth_token', token);
	setCookie(getAuthCookieName(), token, getAuthCookieMaxAge());
}

// Get auth token from localStorage
export function getToken(): string | null {
	return localStorage.getItem('auth_token');
}

// Clear auth token from both localStorage and cookies
function clearToken(): void {
	localStorage.removeItem('auth_token');
	deleteCookie(getAuthCookieName());
}

// Store user data in localStorage
export function setUserData(user: User): void {
	localStorage.setItem('user_data', JSON.stringify(user));
}

// Get user data from localStorage
export function getUserData(): User | null {
	const data = localStorage.getItem('user_data');
	return data ? JSON.parse(data) : null;
}

// Remove user data from localStorage
export function removeUserData(): void {
	localStorage.removeItem('user_data');
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
	return !!getToken();
}

// Handle successful authentication
function handleAuthSuccess(authResponse: AuthResponse) {
	setToken(authResponse.token);
	setUserData(authResponse.user);
	// Dispatch an event that can be caught by layout components
	const event = new CustomEvent('auth-success', { detail: authResponse });
	window.dispatchEvent(event);
}

// Login user
export async function login(data: LoginData): Promise<AuthResponse> {
	const response = await fetch(buildApiUrl('/auth/login'), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.message || 'Login failed');
	}

	const authResponse = await response.json();
	handleAuthSuccess(authResponse);
	return authResponse;
}

// Login with DID
export async function loginWithDID(data: DIDLoginData): Promise<AuthResponse> {
	const response = await fetch(buildApiUrl('/auth/login-with-did'), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.message || 'DID login failed');
	}

	const authResponse = await response.json();
	handleAuthSuccess(authResponse);

	// Store DID settings
	if (authResponse.user?.did) {
		localStorage.setItem('did_settings', JSON.stringify({
			id: authResponse.user.did,
			enabled: true,
			lastAuthenticated: new Date().toISOString(),
		}));
	}

	return authResponse;
}

// Register user
export async function register(data: LoginData): Promise<AuthResponse> {
	const response = await fetch(buildApiUrl('/auth/register'), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.message || 'Registration failed');
	}

	const authResponse = await response.json();
	handleAuthSuccess(authResponse);
	return authResponse;
}

// Logout user
export function logout(): void {
	clearToken();
	removeUserData();
	localStorage.removeItem('did_settings');

	// Dispatch logout event
	window.dispatchEvent(new Event('auth-logout'));

	// Let Next.js handle navigation
	const event = new Event('auth-navigate', {
		bubbles: true,
		cancelable: true
	});
	window.dispatchEvent(event);
}

// Update user profile
export async function updateProfile(data: UpdateProfileData): Promise<User> {
	const response = await authenticatedFetch(buildApiUrl('/users/me'), {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.message || 'Failed to update profile');
	}

	const updatedUser = await response.json();
	setUserData(updatedUser);
	return updatedUser;
}

// Update security settings
export async function updateSecurity(data: UpdateSecurityData): Promise<{ success: boolean, message: string }> {
	const response = await authenticatedFetch(buildApiUrl('/users/me/security'), {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.message || 'Failed to update security settings');
	}

	const result = await response.json();
	// Update user data in localStorage if security settings changed
	if (result.success) {
		const userData = getUserData();
		if (userData) {
			userData.is_two_factor_enabled = data.enable_two_factor;
			setUserData(userData);
		}
	}
	return result;
}

// Update password
export async function updatePassword(data: UpdatePasswordData): Promise<{ success: boolean, message: string }> {
	const response = await authenticatedFetch(buildApiUrl('/users/me/password'), {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.message || 'Failed to update password');
	}

	return response.json();
}

// Get DID settings
export interface DIDSettings {
	id: string;
	enabled: boolean;
	lastAuthenticated: string;
}

export function getDIDSettings(): DIDSettings | null {
	const settings = localStorage.getItem('did_settings');
	return settings ? JSON.parse(settings) : null;
}

// API request with authentication
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
	const token = getToken();
	if (!token) {
		throw new Error('Not authenticated');
	}

	const headers = {
		...options.headers,
		Authorization: `Bearer ${token}`,
	};

	return fetch(url, {
		...options,
		headers,
	});
}
