const nextJest = require('next/jest')

const createJestConfig = nextJest({
	// Provide the path to your Next.js app to load next.config.js and .env files
	dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	moduleNameMapper: {
		// Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
		'^@/(.*)$': '<rootDir>/src/$1',
	},
	testEnvironment: 'jest-environment-jsdom',
	collectCoverageFrom: [
		'src/**/*.{js,jsx,ts,tsx}',
		'!src/**/*.d.ts',
		'!src/**/index.ts',
		'!src/app/**/layout.tsx',
		'!src/app/**/not-found.tsx',
	],
	testPathIgnorePatterns: [
		'<rootDir>/.next/',
		'<rootDir>/node_modules/',
	],
	transform: {
		'^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
	},
	transformIgnorePatterns: [
		'/node_modules/',
		'^.+\\.module\\.(css|sass|scss)$',
	],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
	watchPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
	globals: {
		'ts-jest': {
			tsconfig: 'tsconfig.json',
		},
	},
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)