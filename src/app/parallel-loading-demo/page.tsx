'use client'

import {useState} from 'react'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {Progress} from '@/components/ui/progress'
import {wasmLoader} from '@/lib/wasm-loader'

export default function ParallelLoadingDemo() {
	const [isLoading, setIsLoading] = useState(false)
	const [loadingMethod, setLoadingMethod] = useState<'sequential' | 'parallel' | null>(null)
	const [results, setResults] = useState<{
		method: string
		duration: number
		cryptoTime?: number
		didTime?: number
		cacheInfo?: {size: number; entries: string[]}
	} | null>(null)
	const [error, setError] = useState<string | null>(null)

	const loadSequentially = async () => {
		setIsLoading(true)
		setLoadingMethod('sequential')
		setError(null)
		const startTime = performance.now()

		try {
			// Reset loader to ensure fresh load
			wasmLoader.resetToMainThread()

			const cryptoStartTime = performance.now()
			await wasmLoader.loadCrypto()
			const cryptoEndTime = performance.now()

			const didStartTime = performance.now()
			await wasmLoader.loadDID()
			const didEndTime = performance.now()

			const endTime = performance.now()
			const cacheInfo = await wasmLoader.getCacheInfo()

			setResults({
				method: 'Sequential Loading',
				duration: endTime - startTime,
				cryptoTime: cryptoEndTime - cryptoStartTime,
				didTime: didEndTime - didStartTime,
				cacheInfo,
			})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error')
		} finally {
			setIsLoading(false)
			setLoadingMethod(null)
		}
	}

	const loadInParallel = async () => {
		setIsLoading(true)
		setLoadingMethod('parallel')
		setError(null)
		const startTime = performance.now()

		try {
			// Reset loader to ensure fresh load
			wasmLoader.resetToMainThread()

			// Use the new parallel loading method
			await wasmLoader.loadBoth()

			const endTime = performance.now()
			const cacheInfo = await wasmLoader.getCacheInfo()

			setResults({
				method: 'Parallel Loading',
				duration: endTime - startTime,
				cacheInfo,
			})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error')
		} finally {
			setIsLoading(false)
			setLoadingMethod(null)
		}
	}

	const clearCache = async () => {
		try {
			await wasmLoader.clearCache()
			setResults(null)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to clear cache')
		}
	}

	const testCachedLoad = async () => {
		setIsLoading(true)
		setError(null)
		const startTime = performance.now()

		try {
			// Load again to test caching (should be faster)
			await wasmLoader.loadBoth()

			const endTime = performance.now()
			const cacheInfo = await wasmLoader.getCacheInfo()

			setResults({
				method: 'Cached Parallel Loading',
				duration: endTime - startTime,
				cacheInfo,
			})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className='container mx-auto py-8 space-y-6'>
			<div className='text-center space-y-2'>
				<h1 className='text-3xl font-bold'>WASM Parallel Loading Demo</h1>
				<p className='text-muted-foreground'>Compare sequential vs parallel loading performance with caching</p>
			</div>

			<div className='grid gap-4 md:grid-cols-2'>
				<Card>
					<CardHeader>
						<CardTitle>Loading Tests</CardTitle>
						<CardDescription>Test different loading strategies and caching behavior</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<Button onClick={loadSequentially} disabled={isLoading} variant='outline' className='w-full'>
							{loadingMethod === 'sequential' ? 'Loading Sequentially...' : 'Load Sequentially'}
						</Button>

						<Button onClick={loadInParallel} disabled={isLoading} className='w-full'>
							{loadingMethod === 'parallel' ? 'Loading in Parallel...' : 'Load in Parallel'}
						</Button>

						<Button onClick={testCachedLoad} disabled={isLoading} variant='secondary' className='w-full'>
							Test Cached Loading
						</Button>

						<Button onClick={clearCache} disabled={isLoading} variant='destructive' className='w-full'>
							Clear Cache
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Results</CardTitle>
						<CardDescription>Loading performance metrics and cache information</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading && (
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<span>Loading WASM modules...</span>
									<Badge variant='secondary'>{loadingMethod === 'parallel' ? 'Parallel' : 'Sequential'}</Badge>
								</div>
								<Progress value={undefined} className='w-full' />
							</div>
						)}

						{error && (
							<div className='p-4 border border-red-200 rounded-lg bg-red-50'>
								<p className='text-red-600 text-sm font-medium'>Error:</p>
								<p className='text-red-800 text-sm'>{error}</p>
							</div>
						)}

						{results && !isLoading && (
							<div className='space-y-4'>
								<div className='flex items-center justify-between'>
									<span className='font-medium'>{results.method}</span>
									<Badge variant='default'>{results.duration.toFixed(2)}ms</Badge>
								</div>

								{results.cryptoTime !== undefined && (
									<div className='text-sm text-muted-foreground'>
										<div>Crypto WASM: {results.cryptoTime.toFixed(2)}ms</div>
										<div>DID WASM: {results.didTime?.toFixed(2)}ms</div>
									</div>
								)}

								{results.cacheInfo && (
									<div className='space-y-2'>
										<h4 className='font-medium text-sm'>Cache Information</h4>
										<div className='text-sm text-muted-foreground'>
											<div>Cache Size: {(results.cacheInfo.size / 1024 / 1024).toFixed(2)} MB</div>
											<div>Cached Entries: {results.cacheInfo.entries.length}</div>
											<div className='text-xs'>WASM Version: {wasmLoader.wasmVersion}</div>
										</div>
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Features Demonstrated</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='grid gap-4 md:grid-cols-2'>
						<div>
							<h4 className='font-medium mb-2'>🚀 Parallel Loading</h4>
							<p className='text-sm text-muted-foreground'>Both crypto.wasm and did.wasm are loaded simultaneously, reducing total loading time.</p>
						</div>
						<div>
							<h4 className='font-medium mb-2'>💾 Smart Caching</h4>
							<p className='text-sm text-muted-foreground'>WASM files are cached in the browser with version management and automatic cache busting.</p>
						</div>
						<div>
							<h4 className='font-medium mb-2'>🔄 Cache Busting</h4>
							<p className='text-sm text-muted-foreground'>Version parameters ensure fresh copies are loaded when WASM files are updated.</p>
						</div>
						<div>
							<h4 className='font-medium mb-2'>⚡ Performance</h4>
							<p className='text-sm text-muted-foreground'>Subsequent loads are faster thanks to browser caching with 24-hour expiry.</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
