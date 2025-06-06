'use client'

import {useState, useEffect} from 'react'
import {wasmLoader} from '@/lib/wasm-loader'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'

export default function TestWASMFixPage() {
	const [status, setStatus] = useState({
		cryptoLoaded: false,
		didLoaded: false,
		cryptoLoading: false,
		didLoading: false,
		error: null as string | null,
		workerStatus: null as any,
		lastTest: null as string | null,
	})

	const updateStatus = async () => {
		try {
			const workerStatus = await wasmLoader.getWorkerStatus()
			setStatus((prev) => ({...prev, workerStatus}))
		} catch (error) {
			console.error('Failed to get worker status:', error)
		}
	}

	useEffect(() => {
		updateStatus()
	}, [])

	const testCryptoLoading = async () => {
		setStatus((prev) => ({...prev, cryptoLoading: true, error: null}))
		try {
			console.log('Testing crypto WASM loading...')
			await wasmLoader.loadCrypto()
			setStatus((prev) => ({...prev, cryptoLoaded: true, cryptoLoading: false, lastTest: 'Crypto loaded successfully'}))
			await updateStatus()
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			console.error('Crypto loading failed:', error)
			setStatus((prev) => ({...prev, cryptoLoading: false, error: errorMessage}))
		}
	}

	const testDIDLoading = async () => {
		setStatus((prev) => ({...prev, didLoading: true, error: null}))
		try {
			console.log('Testing DID WASM loading...')
			await wasmLoader.loadDID()
			setStatus((prev) => ({...prev, didLoaded: true, didLoading: false, lastTest: 'DID loaded successfully'}))
			await updateStatus()
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			console.error('DID loading failed:', error)
			setStatus((prev) => ({...prev, didLoading: false, error: errorMessage}))
		}
	}

	const testDIDCreation = async () => {
		setStatus((prev) => ({...prev, error: null}))
		try {
			console.log('Testing DID creation...')
			const result = await wasmLoader.createDID()
			console.log('DID created:', result)
			setStatus((prev) => ({...prev, lastTest: `DID created: ${result.did.id.substring(0, 20)}...`}))
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			console.error('DID creation failed:', error)
			setStatus((prev) => ({...prev, error: errorMessage}))
		}
	}

	const resetWorker = () => {
		wasmLoader.resetToMainThread()
		setStatus({
			cryptoLoaded: false,
			didLoaded: false,
			cryptoLoading: false,
			didLoading: false,
			error: null,
			workerStatus: null,
			lastTest: 'Reset to main thread mode',
		})
	}

	const pingWorker = async () => {
		try {
			const result = await wasmLoader.pingWorker()
			console.log('Ping result:', result)
			setStatus((prev) => ({...prev, lastTest: `Ping successful: ${result.timestamp}`}))
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			setStatus((prev) => ({...prev, error: errorMessage}))
		}
	}

	return (
		<div className='container mx-auto p-8 space-y-6'>
			<Card>
				<CardHeader>
					<CardTitle>WASM Loading Test & Fix Verification</CardTitle>
					<CardDescription>Test the fixed WASM worker timeout and loading issues</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex flex-wrap gap-2'>
						<Badge variant={status.cryptoLoaded ? 'default' : 'secondary'}>Crypto: {status.cryptoLoaded ? 'Loaded' : 'Not Loaded'}</Badge>
						<Badge variant={status.didLoaded ? 'default' : 'secondary'}>DID: {status.didLoaded ? 'Loaded' : 'Not Loaded'}</Badge>
						<Badge variant={wasmLoader.isUsingWebWorker ? 'default' : 'outline'}>Mode: {wasmLoader.isUsingWebWorker ? 'Web Worker' : 'Main Thread'}</Badge>
					</div>

					{status.workerStatus && (
						<div className='bg-gray-50 p-4 rounded'>
							<h4 className='font-semibold mb-2'>Worker Status:</h4>
							<pre className='text-sm overflow-auto'>{JSON.stringify(status.workerStatus, null, 2)}</pre>
						</div>
					)}

					<div className='flex flex-wrap gap-2'>
						<Button onClick={testCryptoLoading} disabled={status.cryptoLoading} variant='outline'>
							{status.cryptoLoading ? 'Loading...' : 'Test Crypto Loading'}
						</Button>
						<Button onClick={testDIDLoading} disabled={status.didLoading} variant='outline'>
							{status.didLoading ? 'Loading...' : 'Test DID Loading'}
						</Button>
						<Button onClick={testDIDCreation} disabled={!status.didLoaded} variant='outline'>
							Test DID Creation
						</Button>
					</div>

					<div className='flex flex-wrap gap-2'>
						<Button onClick={pingWorker} variant='secondary' size='sm'>
							Ping Worker
						</Button>
						<Button onClick={updateStatus} variant='secondary' size='sm'>
							Refresh Status
						</Button>
						<Button onClick={resetWorker} variant='destructive' size='sm'>
							Reset to Main Thread
						</Button>
					</div>

					{status.error && (
						<div className='bg-red-50 border border-red-200 rounded p-4'>
							<h4 className='font-semibold text-red-800 mb-2'>Error:</h4>
							<p className='text-red-700 text-sm'>{status.error}</p>
						</div>
					)}

					{status.lastTest && (
						<div className='bg-green-50 border border-green-200 rounded p-4'>
							<h4 className='font-semibold text-green-800 mb-2'>Last Test Result:</h4>
							<p className='text-green-700 text-sm'>{status.lastTest}</p>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Console Logs</CardTitle>
					<CardDescription>Open browser developer tools to see detailed logging</CardDescription>
				</CardHeader>
				<CardContent>
					<p className='text-sm text-gray-600'>The fixes include:</p>
					<ul className='list-disc list-inside text-sm text-gray-600 mt-2 space-y-1'>
						<li>Increased timeout from 30s to 60s for large WASM files</li>
						<li>Added file size detection and automatic fallback for files &gt; 15MB</li>
						<li>Improved error handling and logging</li>
						<li>Added retry logic for worker initialization</li>
						<li>Better fallback mechanism to main thread</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	)
}
