'use client'

import {useState, useEffect} from 'react'
import {wasmAuth} from '@/lib/wasm-auth'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Badge} from '@/components/ui/badge'
import {Progress} from '@/components/ui/progress'
import {Separator} from '@/components/ui/separator'
import {CheckCircle, AlertCircle, Zap, Clock, Cpu, PlayCircle, RefreshCw, Activity} from 'lucide-react'

interface PerformanceMetrics {
	operation: string
	startTime: number
	endTime: number
	duration: number
	success: boolean
	error?: string
}

export default function WASMWorkerDemo() {
	const [isLoading, setIsLoading] = useState(false)
	const [systemStatus, setSystemStatus] = useState<any>(null)
	const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([])
	const [progress, setProgress] = useState(0)
	const [currentOperation, setCurrentOperation] = useState('')

	useEffect(() => {
		loadSystemStatus()
	}, [])

	const loadSystemStatus = async () => {
		try {
			const status = await wasmAuth.getSystemStatus()
			setSystemStatus(status)
		} catch (error) {
			console.error('Failed to load system status:', error)
		}
	}

	const addMetric = (metric: PerformanceMetrics) => {
		setPerformanceMetrics((prev) => [...prev, metric])
	}

	const runPerformanceTest = async () => {
		setIsLoading(true)
		setProgress(0)
		setPerformanceMetrics([])

		const operations = [
			{name: 'Preload WASM Modules', fn: () => wasmAuth.preloadWASMModules()},
			{name: 'Generate Key Pair', fn: () => wasmAuth.generateAuthKeyPair()},
			{name: 'Hash Password', fn: () => wasmAuth.hashPassword('test-password-123')},
			{name: 'Create DID', fn: () => wasmAuth.createDIDClientSide('Test User', '1990-01-01')},
			{name: 'Create Membership Proof', fn: () => wasmAuth.createMembershipProofClientSide('test-org', 1000, 500, 2000)},
		]

		try {
			for (let i = 0; i < operations.length; i++) {
				const operation = operations[i]
				setCurrentOperation(operation.name)
				setProgress(((i + 1) / operations.length) * 100)

				const startTime = performance.now()
				try {
					await operation.fn()
					const endTime = performance.now()
					addMetric({
						operation: operation.name,
						startTime,
						endTime,
						duration: endTime - startTime,
						success: true,
					})
				} catch (error) {
					const endTime = performance.now()
					addMetric({
						operation: operation.name,
						startTime,
						endTime,
						duration: endTime - startTime,
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error',
					})
				}
			}

			// Refresh system status after operations
			await loadSystemStatus()
		} finally {
			setIsLoading(false)
			setCurrentOperation('')
			setProgress(100)
		}
	}

	const resetTest = () => {
		setPerformanceMetrics([])
		setProgress(0)
		setCurrentOperation('')
	}

	const formatDuration = (ms: number) => {
		if (ms < 1000) {
			return `${ms.toFixed(2)}ms`
		}
		return `${(ms / 1000).toFixed(2)}s`
	}

	const averageDuration = performanceMetrics.length > 0 ? performanceMetrics.reduce((acc, metric) => acc + metric.duration, 0) / performanceMetrics.length : 0

	const successRate = performanceMetrics.length > 0 ? (performanceMetrics.filter((m) => m.success).length / performanceMetrics.length) * 100 : 0

	return (
		<div className='container mx-auto p-6 space-y-6'>
			<div className='space-y-2'>
				<h1 className='text-3xl font-bold flex items-center space-x-2'>
					<Zap className='w-8 h-8' />
					<span>WASM Web Worker Performance Demo</span>
				</h1>
				<p className='text-muted-foreground'>Demonstrate the performance benefits of loading WebAssembly modules via Web Workers to prevent browser UI blocking.</p>
			</div>

			{/* System Status Card */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center space-x-2'>
						<Activity className='w-5 h-5' />
						<span>System Status</span>
					</CardTitle>
					<CardDescription>Current Web Worker and WASM module status</CardDescription>
				</CardHeader>
				<CardContent>
					{systemStatus ? (
						<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
							<div className='space-y-2'>
								<Badge variant={systemStatus.webWorkerSupported ? 'default' : 'destructive'}>{systemStatus.webWorkerSupported ? '✓' : '✗'} Web Workers</Badge>
							</div>
							<div className='space-y-2'>
								<Badge variant={systemStatus.usingWebWorker ? 'default' : 'secondary'}>
									{systemStatus.usingWebWorker ? '⚡' : '🐌'} {systemStatus.usingWebWorker ? 'Worker Mode' : 'Main Thread'}
								</Badge>
							</div>
							{systemStatus.workerStatus && (
								<>
									<div className='space-y-2'>
										<Badge variant={systemStatus.workerStatus.cryptoLoaded ? 'default' : 'secondary'}>{systemStatus.workerStatus.cryptoLoaded ? '✓' : '○'} Crypto WASM</Badge>
									</div>
									<div className='space-y-2'>
										<Badge variant={systemStatus.workerStatus.didLoaded ? 'default' : 'secondary'}>{systemStatus.workerStatus.didLoaded ? '✓' : '○'} DID WASM</Badge>
									</div>
								</>
							)}
						</div>
					) : (
						<div className='text-muted-foreground'>Loading system status...</div>
					)}

					<div className='mt-4 flex space-x-2'>
						<Button onClick={loadSystemStatus} variant='outline' size='sm'>
							<RefreshCw className='w-4 h-4 mr-2' />
							Refresh Status
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Performance Test Card */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center space-x-2'>
						<PlayCircle className='w-5 h-5' />
						<span>Performance Test</span>
					</CardTitle>
					<CardDescription>Run a series of WASM operations to measure performance</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex space-x-2'>
						<Button onClick={runPerformanceTest} disabled={isLoading} className='flex-1'>
							{isLoading ? (
								<>
									<Cpu className='w-4 h-4 mr-2 animate-pulse' />
									Running Test...
								</>
							) : (
								<>
									<PlayCircle className='w-4 h-4 mr-2' />
									Run Performance Test
								</>
							)}
						</Button>
						<Button onClick={resetTest} variant='outline' disabled={isLoading}>
							Reset
						</Button>
					</div>

					{isLoading && (
						<div className='space-y-2'>
							<div className='flex justify-between text-sm'>
								<span>Current: {currentOperation}</span>
								<span>{progress.toFixed(0)}%</span>
							</div>
							<Progress value={progress} className='w-full' />
						</div>
					)}

					{performanceMetrics.length > 0 && (
						<div className='space-y-4'>
							<Separator />

							{/* Summary Stats */}
							<div className='grid grid-cols-3 gap-4 text-center'>
								<div className='space-y-1'>
									<div className='text-2xl font-bold text-green-600'>{formatDuration(averageDuration)}</div>
									<div className='text-sm text-muted-foreground'>Avg Duration</div>
								</div>
								<div className='space-y-1'>
									<div className='text-2xl font-bold text-blue-600'>{successRate.toFixed(0)}%</div>
									<div className='text-sm text-muted-foreground'>Success Rate</div>
								</div>
								<div className='space-y-1'>
									<div className='text-2xl font-bold text-purple-600'>{performanceMetrics.length}</div>
									<div className='text-sm text-muted-foreground'>Operations</div>
								</div>
							</div>

							<Separator />

							{/* Detailed Results */}
							<div className='space-y-2'>
								<h4 className='font-medium flex items-center space-x-2'>
									<Clock className='w-4 h-4' />
									<span>Operation Results</span>
								</h4>
								<div className='space-y-2'>
									{performanceMetrics.map((metric, index) => (
										<div key={index} className='flex items-center justify-between p-3 rounded-md bg-muted'>
											<div className='flex items-center space-x-2'>
												{metric.success ? <CheckCircle className='w-4 h-4 text-green-600' /> : <AlertCircle className='w-4 h-4 text-red-600' />}
												<span className='font-medium'>{metric.operation}</span>
											</div>
											<div className='text-right'>
												<div className='font-mono text-sm'>{formatDuration(metric.duration)}</div>
												{metric.error && <div className='text-xs text-red-600'>{metric.error}</div>}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{!isLoading && performanceMetrics.length > 0 && (
						<Alert>
							<Zap className='h-4 w-4' />
							<AlertDescription>
								<strong>Web Worker Benefits:</strong> All WASM operations were executed without blocking the main UI thread, allowing for smooth user interactions during heavy cryptographic computations.
							</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
