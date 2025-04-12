import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuthCookieName } from './lib/config'

// Paths that require authentication
const protectedPaths = [
	'/dashboard',
	'/profile',
	'/settings'
]

// Paths that should redirect to dashboard if already authenticated
const authPaths = [
	'/login',
	'/register'
]

// Function to verify token expiration
function isTokenExpired(token: string): boolean {
	try {
		const tokenParts = token.split('.')
		if (tokenParts.length !== 3) return true

		const payload = JSON.parse(atob(tokenParts[1]))
		const exp = payload.exp * 1000 // Convert to milliseconds
		return Date.now() >= exp
	} catch {
		return true
	}
}

// Function to handle authentication errors
function handleAuthError(request: NextRequest): NextResponse {
	const response = NextResponse.redirect(new URL('/login', request.url))
	response.cookies.delete(getAuthCookieName())

	// Add error message to search params
	const loginUrl = new URL('/login', request.url)
	loginUrl.searchParams.set('error', 'Session expired. Please login again.')

	return NextResponse.redirect(loginUrl)
}

export function middleware(request: NextRequest) {
	const authCookie = request.cookies.get(getAuthCookieName())
	const token = authCookie?.value
	const { pathname } = request.nextUrl

	// Check if path requires authentication
	const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
	const isAuthPath = authPaths.some(path => pathname.startsWith(path))

	// Handle protected paths
	if (isProtectedPath) {
		if (!token || isTokenExpired(token)) {
			return handleAuthError(request)
		}
	}

	// Handle auth paths (login/register)
	if (isAuthPath && token && !isTokenExpired(token)) {
		return NextResponse.redirect(new URL('/dashboard/profile', request.url))
	}

	// For all other paths, continue
	return NextResponse.next()
}

export const config = {
	matcher: [
		/*
		 * Match all protected paths and auth paths:
		 * - /dashboard/*
		 * - /profile
		 * - /settings
		 * - /login
		 * - /register
		 */
		'/dashboard/:path*',
		'/profile',
		'/settings',
		'/login',
		'/register'
	]
}
