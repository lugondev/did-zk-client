'use client'

import React, {useState, useEffect} from 'react'
import {Progress} from '@/components/ui/progress'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {CheckCircle, AlertCircle, Loader2, Download, Zap, Trash2, Info, RefreshCw} from 'lucide-react'
import {serviceWorkerManager} from '@/lib/service-worker'

export interface WasmLoadingState {
	isLoading: boolean
	progress: number
	stage: string
	error?: string
	fromCache?: boolean
	compressed?: boolean
	size?: number
	loadTime?: number
}

interface CacheInfo {
	totalSize: number
	entries: Array<{
		url: string
		size: number
		cacheName: string
	}>
}

interface WasmLoadingProgressProps {
	title: string
	state: WasmLoadingState
	className?: string
	showCacheControls?: boolean
}

export function WasmLoadingProgress({title, state, className = '', showCacheControls = false}: WasmLoadingProgressProps) {
	const [cacheInfo, setCacheInfo] = useState<CacheInfo>({totalSize: 0, entries: []})
	const [isLoadingCache, setIsLoadingCache] = useState(false)
	const [swState, setSwState] = useState<string>('checking')

	useEffect(() => {
		// Check service worker state
		setSwState(serviceWorkerManager.getState())

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
			await loadCacheInfo()
		} catch (error) {
			console.error('Failed to clear cache:', error)
		} finally {
			setIsLoadingCache(false)
		}
	}

	const preloadWasm = async () => {
		try {
			setIsLoadingCache(true)
			await serviceWorkerManager.preloadWasm()
			await loadCacheInfo()
		} catch (error) {
			console.error('Failed to preload WASM:', error)
		} finally {
			setIsLoadingCache(false)
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

	const getStatusIcon = () => {
		if (state.error) return <AlertCircle className='h-5 w-5 text-red-500' />
		if (state.progress === 100 && !state.isLoading) return <CheckCircle className='h-5 w-5 text-green-500' />
		if (state.isLoading) return <Loader2 className='h-5 w-5 text-blue-500 animate-spin' />
		return <Download className='h-5 w-5 text-gray-400' />
	}

	const getStatusColor = () => {
		if (state.error) return 'destructive'
		if (state.progress === 100 && !state.isLoading) return 'default'
		if (state.isLoading) return 'secondary'
		return 'outline'
	}

	return (
		<Card className={`w-full ${className}`}>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<CardTitle className='flex items-center gap-2'>
						{getStatusIcon()}
						{title}
					</CardTitle>
					<div className='flex items-center gap-2'>
						{state.fromCache && (
							<Badge variant='outline' className='text-xs'>
								<Zap className='h-3 w-3 mr-1' />
								Cached
							</Badge>
						)}
						{state.compressed && (
							<Badge variant='outline' className='text-xs'>
								Compressed
							</Badge>
						)}
						<Badge variant={getStatusColor()}>{state.error ? 'Error' : state.progress === 100 && !state.isLoading ? 'Ready' : state.isLoading ? 'Loading' : 'Idle'}</Badge>
					</div>
				</div>
				<CardDescription>{state.stage}</CardDescription>
			</CardHeader>

			<CardContent className='space-y-4'>
				{/* Progress Bar */}
				<div className='space-y-2'>
					<div className='flex justify-between text-sm'>
						<span className='text-muted-foreground'>Progress</span>
						<span className='font-medium'>{Math.round(state.progress)}%</span>
					</div>
					<Progress value={state.progress} className='h-2' />
				</div>

				{/* Error Display */}
				{state.error && (
					<div className='p-3 bg-red-50 border border-red-200 rounded-md'>
						<p className='text-sm text-red-700'>{state.error}</p>
					</div>
				)}

				{/* Loading Details */}
				<div className='grid grid-cols-2 gap-4 text-xs text-muted-foreground'>
					{state.size && (
						<div className='flex justify-between'>
							<span>Size:</span>
							<span>{formatBytes(state.size)}</span>
						</div>
					)}
					{state.loadTime && (
						<div className='flex justify-between'>
							<span>Load Time:</span>
							<span>{formatTime(state.loadTime)}</span>
						</div>
					)}
				</div>

				{/* Service Worker Cache Controls */}
				{showCacheControls && (
					<div className='border-t pt-4 space-y-3'>
						<div className='flex items-center justify-between'>
							<h4 className='text-sm font-medium flex items-center gap-2'>
								<Info className='h-4 w-4' />
								Service Worker Cache
							</h4>
							<Badge variant={swState === 'active' ? 'default' : 'secondary'}>{swState}</Badge>
						</div>

						{swState === 'active' && (
							<>
								<div className='text-xs text-muted-foreground space-y-1'>
									<div className='flex justify-between'>
										<span>Total Cache Size:</span>
										<span>{formatBytes(cacheInfo.totalSize)}</span>
									</div>
									<div className='flex justify-between'>
										<span>Cached Entries:</span>
										<span>{cacheInfo.entries.length}</span>
									</div>
								</div>

								<div className='flex gap-2'>
									<Button size='sm' variant='outline' onClick={loadCacheInfo} disabled={isLoadingCache} className='flex-1'>
										{isLoadingCache ? <Loader2 className='h-3 w-3 animate-spin' /> : <RefreshCw className='h-3 w-3' />}
										Refresh
									</Button>

									<Button size='sm' variant='outline' onClick={preloadWasm} disabled={isLoadingCache} className='flex-1'>
										{isLoadingCache ? <Loader2 className='h-3 w-3 animate-spin' /> : <Download className='h-3 w-3' />}
										Preload
									</Button>

									<Button size='sm' variant='destructive' onClick={clearCache} disabled={isLoadingCache} className='flex-1'>
										{isLoadingCache ? <Loader2 className='h-3 w-3 animate-spin' /> : <Trash2 className='h-3 w-3' />}
										Clear
									</Button>
								</div>
							</>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

export default WasmLoadingProgress
