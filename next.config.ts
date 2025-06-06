import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	// Enable experimental features for better performance
	experimental: {
		// Enable optimized package imports
		optimizePackageImports: ['@/components', '@/lib'],
	},

	// Webpack configuration for WASM support
	webpack: (config, { isServer }) => {
		// Add WASM support
		config.experiments = {
			...config.experiments,
			asyncWebAssembly: true,
			layers: true,
		};

		// Add WASM file handling
		config.module.rules.push({
			test: /\.wasm$/,
			type: 'webassembly/async',
		});

		// Optimize for client-side
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				path: false,
				crypto: false,
			};
		}

		return config;
	},

	// Headers for WASM files and optimization
	async headers() {
		return [
			{
				source: '/(.*)\.wasm',
				headers: [
					{
						key: 'Cross-Origin-Embedder-Policy',
						value: 'require-corp',
					},
					{
						key: 'Cross-Origin-Opener-Policy',
						value: 'same-origin',
					},
					{
						key: 'Content-Type',
						value: 'application/wasm',
					},
					{
						key: 'Cache-Control',
						value: 'public, max-age=604800, stale-while-revalidate=2592000', // 7 days cache, 30 days stale
					},
					{
						key: 'Vary',
						value: 'Accept-Encoding',
					},
				],
			},
			{
				source: '/wasm_exec.js',
				headers: [
					{
						key: 'Cross-Origin-Embedder-Policy',
						value: 'require-corp',
					},
					{
						key: 'Cross-Origin-Opener-Policy',
						value: 'same-origin',
					},
					{
						key: 'Content-Type',
						value: 'application/javascript',
					},
					{
						key: 'Cache-Control',
						value: 'public, max-age=604800, stale-while-revalidate=2592000', // 7 days cache, 30 days stale
					},

				],
			},
			{
				source: '/wasm-worker.js',
				headers: [
					{
						key: 'Cross-Origin-Embedder-Policy',
						value: 'require-corp',
					},
					{
						key: 'Cross-Origin-Opener-Policy',
						value: 'same-origin',
					},
					{
						key: 'Content-Type',
						value: 'application/javascript',
					},
					{
						key: 'Cache-Control',
						value: 'public, max-age=604800, stale-while-revalidate=2592000', // 7 days cache, 30 days stale
					},

				],
			},
		];
	},

	// Compression configuration
	compress: true,

	// Output configuration for better performance
	output: 'standalone',

	// Image optimization
	images: {
		formats: ['image/webp', 'image/avif'],
		minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
	},

	// Performance optimizations
	poweredByHeader: false,
	generateEtags: true,
};

export default nextConfig;
