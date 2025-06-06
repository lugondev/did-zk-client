module.exports = {
	collectCoverageFrom: [
		'src/**/*.{js,jsx,ts,tsx}',
		'!src/**/*.d.ts',
		'!src/**/index.ts',
		'!src/app/**/layout.tsx',
		'!src/app/**/not-found.tsx',
		'!src/app/**/loading.tsx',
		'!src/app/**/error.tsx',
		'!src/**/*.stories.{js,jsx,ts,tsx}',
		'!src/**/__tests__/**',
		'!src/**/node_modules/**',
	],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80,
		},
		'./src/lib/': {
			branches: 85,
			functions: 85,
			lines: 85,
			statements: 85,
		},
		'./src/components/': {
			branches: 75,
			functions: 75,
			lines: 75,
			statements: 75,
		},
	},
	coverageReporters: [
		'text',
		'text-summary',
		'html',
		'lcov',
		'clover',
	],
	coverageDirectory: 'coverage',
}