'use client'

import React, {useState, useEffect} from 'react'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {Progress} from '@/components/ui/progress'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Download, Zap, Clock, HardDrive, Wifi, CheckCircle, AlertCircle, Loader2, BarChart3, Settings, RefreshCw} from 'lucide-react'
import {wasmLoader, type ProgressCallback} from '@/lib/wasm-loader'
import WasmLoadingProgress, {type WasmLoadingState} from '@/components/WasmLoadingProgress'
import {serviceWorkerManager} from '@/lib/service-worker'

interface CacheInfo {
	totalSize: number
	entries: Array<{
		url: string
		size: number
		cacheName: string
	}>
}

interface LoadingStats {
	startTime: number
	endTime: number
	duration: number
	fromCache: boolean
	compressed: boolean
	size: number
}

export default function WasmOptimizationDemo() {
	const [cryptoState, setCryptoState] = useState<WasmLoadingState>({
		isLoading: false,
		progress: 0,
		stage: 'Ready to load',
		fromCache: false,
		compressed: false,
	})

	const [didState, setDidState] = useState<WasmLoadingState>({
		isLoading: false,
		progress: 0,
		stage: 'Ready to load',
		fromCache: false,
		compressed: false,
	})

	const [parallelState, setParallelState] = useState<WasmLoadingState>({
		isLoading: false,
		progress: 0,
		stage: 'Ready to load',
		fromCache: false,
		compressed: false,
	})

	const [cacheInfo, setCacheInfo] = useState<CacheInfo>({totalSize: 0, entries: []})
	const [isLoadingCache, setIsLoadingCache] = useState(false)
	const [swState, setSwState] = useState<string>('checking')

	useEffect(() => {
		// Check service worker state
		setSwState(serviceWorkerManager.getState())

		// Initialize background preloading
		wasmLoader.initializePreloading()

		// Load cache info if service worker is active
		if (serviceWorkerManager.isActive()) {
			loadCacheInfo()
		}
	}, [])

	const loadCacheInfo = async () => {
		try {
			setIsLoadingCache(true)
			const info = await serviceWorkerManager.getCacheInfo()
			setCacheInfo(info)
		} catch (error) {
			console.error('Failed to load cache info:', error)
		} finally {
			setIsLoadingCache(false)
		}
	}

	const clearCache = async () => {
		try {
			setIsLoadingCache(true)
			await serviceWorkerManager.clearCache()
			await wasmLoader.clearCache()
			await loadCacheInfo()
		} catch (error) {
			console.error('Failed to clear cache:', error)
		} finally {
			setIsLoadingCache(false)
		}
	}

	const createProgressCallback = (setState: React.Dispatch<React.SetStateAction<WasmLoadingState>>): ProgressCallback => {
		return (progress: number, stage: string) => {
			setState((prev) => ({
				...prev,
				progress: Math.min(100, Math.max(0, progress)),
				stage,
			}))
		}
	}

	const loadCrypto = async () => {
		const startTime = Date.now()
		setCryptoState({
			isLoading: true,
			progress: 0,
			stage: 'Initializing crypto WASM...',
			fromCache: false,
			compressed: false,
			size: 4.5 * 1024 * 1024,
		})

		try {
			await wasmLoader.loadCrypto(createProgressCallback(setCryptoState))
			const endTime = Date.now()
			setCryptoState((prev) => ({
				...prev,
				isLoading: false,
				progress: 100,
				stage: 'Crypto WASM loaded successfully!',
				loadTime: endTime - startTime,
			}))
		} catch (error) {
			setCryptoState((prev) => ({
				...prev,
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to load crypto WASM',
			}))
		}
	}

	const loadDID = async () => {
		const startTime = Date.now()
		setDidState({
			isLoading: true,
			progress: 0,
			stage: 'Initializing DID WASM...',
			fromCache: false,
			compressed: false,
			size: 20 * 1024 * 1024,
		})

		try {
			await wasmLoader.loadDID(createProgressCallback(setDidState))
			const endTime = Date.now()
			setDidState((prev) => ({
				...prev,
				isLoading: false,
				progress: 100,
				stage: 'DID WASM loaded successfully!',
				loadTime: endTime - startTime,
			}))
		} catch (error) {
			setDidState((prev) => ({
				...prev,
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to load DID WASM',
			}))
		}
	}

	const loadBoth = async () => {
		const startTime = Date.now()
		setParallelState({
			isLoading: true,
			progress: 0,
			stage: 'Initializing parallel loading...',
			fromCache: false,
			compressed: false,
			size: 24.5 * 1024 * 1024,
		})

		try {
			await wasmLoader.loadBoth(createProgressCallback(setParallelState))
			const endTime = Date.now()
			setParallelState((prev) => ({
				...prev,
				isLoading: false,
				progress: 100,
				stage: 'Both WASM modules loaded successfully!',
				loadTime: endTime - startTime,
			}))
		} catch (error) {
			setParallelState((prev) => ({
				...prev,
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to load WASM modules',
			}))
		}
	}

	const formatBytes = (bytes: number): string => {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
	}

	const formatTime = (ms: number): string => {
		if (ms < 1000) return `${ms}ms`
		return `${(ms / 1000).toFixed(1)}s`
	}

	return (
		<div className='min-h-screen bg-gray-50 py-8'>
			<div className='max-w-6xl mx-auto px-4'>
				{/* Header */}
				<div className='text-center mb-8'>
					<h1 className='text-4xl font-bold text-gray-900 mb-4'>WASM Loading Optimization Demo</h1>
					<p className='text-lg text-gray-600 max-w-3xl mx-auto'>Demonstrate optimized loading of large WASM files with progressive loading, caching, compression, and background preloading.</p>
				</div>

				{/* Optimization Features */}
				<div className='grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
					<div className='bg-white p-6 rounded-lg shadow-md'>
						<div className='text-blue-500 text-2xl mb-2'>🚀</div>
						<h3 className='font-semibold text-gray-900 mb-2'>Progressive Loading</h3>
						<p className='text-sm text-gray-600'>Stream download with real-time progress tracking</p>
					</div>
					<div className='bg-white p-6 rounded-lg shadow-md'>
						<div className='text-green-500 text-2xl mb-2'>💾</div>
						<h3 className='font-semibold text-gray-900 mb-2'>Smart Caching</h3>
						<p className='text-sm text-gray-600'>7-day cache with compression support</p>
					</div>
					<div className='bg-white p-6 rounded-lg shadow-md'>
						<div className='text-purple-500 text-2xl mb-2'>⚡</div>
						<h3 className='font-semibold text-gray-900 mb-2'>Background Preload</h3>
						<p className='text-sm text-gray-600'>Idle-time preloading for instant access</p>
					</div>
					<div className='bg-white p-6 rounded-lg shadow-md'>
						<div className='text-orange-500 text-2xl mb-2'>🔧</div>
						<h3 className='font-semibold text-gray-900 mb-2'>Fallback System</h3>
						<p className='text-sm text-gray-600'>Web Worker with main thread fallback</p>
					</div>
				</div>

				{/* Cache Information */}
				<div className='bg-white rounded-lg shadow-md p-6 mb-8'>
					<div className='flex items-center justify-between mb-4'>
						<h2 className='text-xl font-semibold text-gray-900'>Cache Status</h2>
						<div className='flex gap-2'>
							<button onClick={loadCacheInfo} className='px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors'>
								Refresh
							</button>
							<button onClick={clearCache} className='px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors'>
								Clear Cache
							</button>
						</div>
					</div>
					<div className='grid md:grid-cols-2 gap-4'>
						<div>
							<div className='text-sm text-gray-600 mb-1'>Total Cache Size</div>
							<div className='text-2xl font-bold text-gray-900'>{formatBytes(cacheInfo.totalSize)}</div>
						</div>
						<div>
							<div className='text-sm text-gray-600 mb-1'>Cached Entries</div>
							<div className='text-2xl font-bold text-gray-900'>{cacheInfo.entries.length}</div>
						</div>
					</div>
					{cacheInfo.entries.length > 0 && (
						<div className='mt-4'>
							<div className='text-sm text-gray-600 mb-2'>Cached Files:</div>
							<div className='space-y-1'>
								{cacheInfo.entries.map((entry, index) => (
									<div key={index} className='text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded'>
										{entry.url} ({formatBytes(entry.size)})
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Loading Demos */}
				<div className='grid lg:grid-cols-3 gap-6 mb-8'>
					{/* Crypto WASM Demo */}
					<div className='bg-white rounded-lg shadow-md p-6'>
						<div className='flex items-center justify-between mb-4'>
							<h3 className='text-lg font-semibold text-gray-900'>Crypto WASM</h3>
							<span className='text-sm text-gray-500'>~4.5MB</span>
						</div>
						<WasmLoadingProgress title='Crypto WASM Module' state={cryptoState} showCacheControls={false} />
						<Button onClick={loadCrypto} disabled={cryptoState.isLoading} className='w-full mt-4'>
							{cryptoState.isLoading ? <Loader2 className='h-4 w-4 animate-spin mr-2' /> : <Download className='h-4 w-4 mr-2' />}
							Load Crypto WASM
						</Button>
					</div>

					{/* DID WASM Demo */}
					<div className='bg-white rounded-lg shadow-md p-6'>
						<div className='flex items-center justify-between mb-4'>
							<h3 className='text-lg font-semibold text-gray-900'>DID WASM</h3>
							<span className='text-sm text-red-500 font-medium'>~20MB</span>
						</div>
						<WasmLoadingProgress title='DID WASM Module' state={didState} showCacheControls={false} />
						<Button onClick={loadDID} disabled={didState.isLoading} className='w-full mt-4'>
							{didState.isLoading ? <Loader2 className='h-4 w-4 animate-spin mr-2' /> : <Download className='h-4 w-4 mr-2' />}
							Load DID WASM
						</Button>
					</div>

					{/* Parallel Loading Demo */}
					<div className='bg-white rounded-lg shadow-md p-6'>
						<div className='flex items-center justify-between mb-4'>
							<h3 className='text-lg font-semibold text-gray-900'>Parallel Loading</h3>
							<span className='text-sm text-orange-500 font-medium'>~24.5MB</span>
						</div>
						<WasmLoadingProgress title='Both WASM Modules (Parallel)' state={parallelState} showCacheControls={true} />
						<Button onClick={loadBoth} disabled={parallelState.isLoading} className='w-full mt-4'>
							{parallelState.isLoading ? <Loader2 className='h-4 w-4 animate-spin mr-2' /> : <Download className='h-4 w-4 mr-2' />}
							Load Both WASM
						</Button>
					</div>
				</div>

				{/* Performance Tips */}
				<div className='bg-white rounded-lg shadow-md p-6'>
					<h2 className='text-xl font-semibold text-gray-900 mb-4'>Optimization Features</h2>
					<div className='grid md:grid-cols-2 gap-6'>
						<div>
							<h3 className='font-medium text-gray-900 mb-2'>Implemented Optimizations:</h3>
							<ul className='space-y-1 text-sm text-gray-600'>
								<li>• Progressive loading with real-time progress</li>
								<li>• 7-day browser cache with compression</li>
								<li>• Background preloading during idle time</li>
								<li>• Web Worker with main thread fallback</li>
								<li>• Streaming instantiation support</li>
								<li>• Parallel loading for multiple modules</li>
								<li>• Memory cleanup and cache management</li>
							</ul>
						</div>
						<div>
							<h3 className='font-medium text-gray-900 mb-2'>Performance Benefits:</h3>
							<ul className='space-y-1 text-sm text-gray-600'>
								<li>• First load: Progressive download with progress</li>
								<li>• Subsequent loads: Instant from cache</li>
								<li>• Background preload: Zero perceived load time</li>
								<li>• Compression: ~60-70% size reduction</li>
								<li>• Parallel loading: Faster total load time</li>
								<li>• Fallback system: High reliability</li>
								<li>• Memory management: Reduced memory usage</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
