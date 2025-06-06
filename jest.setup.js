import '@testing-library/jest-dom'

// Extend Jest matchers
expect.extend({
	toBeInTheDocument: (received) => ({
		pass: !!received,
		message: () => `expected element ${received ? '' : 'not '}to be in the document`,
	}),
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
	useRouter() {
		return {
			push: jest.fn(),
			replace: jest.fn(),
			prefetch: jest.fn(),
			back: jest.fn(),
			forward: jest.fn(),
			refresh: jest.fn(),
		}
	},
	useSearchParams() {
		return new URLSearchParams()
	},
	usePathname() {
		return ''
	},
}))

// WASM mocks will be defined in individual test files

// Mock browser APIs
Object.defineProperty(window, 'crypto', {
	value: {
		getRandomValues: jest.fn().mockImplementation((arr) => {
			for (let i = 0; i < arr.length; i++) {
				arr[i] = Math.floor(Math.random() * 256)
			}
			return arr
		}),
	},
})

// Mock WebAssembly
global.WebAssembly = {
	instantiate: jest.fn().mockResolvedValue({
		instance: {
			exports: {},
		},
	}),
	instantiateStreaming: jest.fn().mockResolvedValue({
		instance: {
			exports: {},
		},
	}),
}

// Mock fetch
global.fetch = jest.fn()

// Mock window.Go (for WASM)
global.Go = jest.fn().mockImplementation(() => ({
	importObject: {},
	run: jest.fn(),
}))

// Suppress console errors during tests
const originalError = console.error
beforeAll(() => {
	console.error = (...args) => {
		if (
			typeof args[0] === 'string' &&
			args[0].includes('Warning: ReactDOM.render is deprecated')
		) {
			return
		}
		originalError.call(console, ...args)
	}
})

afterAll(() => {
	console.error = originalError
})