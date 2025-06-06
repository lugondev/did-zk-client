'use client'

import {useState, useEffect} from 'react'
import {runBinaryEncodingDemo, BinaryEncodingUtils} from '@/examples/binary-encoding-demo'
import {DIDCrypto} from '@/app/api/did'

export default function BinaryEncodingDemoPage() {
	const [demoResults, setDemoResults] = useState<{
		keyPair: any
		signature: Uint8Array | null
		verification: boolean | null
		hash: Uint8Array | null
		challenge: Uint8Array | null
		performanceResults: string
	}>({
		keyPair: null,
		signature: null,
		verification: null,
		hash: null,
		challenge: null,
		performanceResults: '',
	})

	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [logs, setLogs] = useState<string[]>([])

	// Override console.log to capture demo output
	useEffect(() => {
		const originalLog = console.log
		console.log = (...args) => {
			originalLog(...args)
			setLogs((prev) => [...prev, args.join(' ')])
		}

		return () => {
			console.log = originalLog
		}
	}, [])

	const runDemo = async () => {
		setIsLoading(true)
		setError(null)
		setLogs([])

		try {
			await runBinaryEncodingDemo()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Demo failed')
		} finally {
			setIsLoading(false)
		}
	}

	const testKeyGeneration = async () => {
		setIsLoading(true)
		setError(null)

		try {
			const keyPair = await DIDCrypto.generateKeyPairBinary()
			setDemoResults((prev) => ({...prev, keyPair}))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Key generation failed')
		} finally {
			setIsLoading(false)
		}
	}

	const testSigning = async () => {
		if (!demoResults.keyPair) {
			setError('Generate key pair first')
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const message = DIDCrypto.stringToUint8Array('Test message for binary signing')
			const signature = await DIDCrypto.signMessageBinary(demoResults.keyPair.privateKey, message)
			setDemoResults((prev) => ({...prev, signature}))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Signing failed')
		} finally {
			setIsLoading(false)
		}
	}

	const testVerification = async () => {
		if (!demoResults.keyPair || !demoResults.signature) {
			setError('Generate key pair and signature first')
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const message = DIDCrypto.stringToUint8Array('Test message for binary signing')
			const verification = await DIDCrypto.verifySignatureBinary(demoResults.keyPair.publicKey, message, demoResults.signature)
			setDemoResults((prev) => ({...prev, verification}))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Verification failed')
		} finally {
			setIsLoading(false)
		}
	}

	const testHashing = async () => {
		setIsLoading(true)
		setError(null)

		try {
			const message = DIDCrypto.stringToUint8Array('Test message for binary hashing')
			const hash = await DIDCrypto.hashMessageBinary(message)
			setDemoResults((prev) => ({...prev, hash}))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Hashing failed')
		} finally {
			setIsLoading(false)
		}
	}

	const testChallenge = async () => {
		setIsLoading(true)
		setError(null)

		try {
			const challenge = await DIDCrypto.generateChallengeBinary(32)
			setDemoResults((prev) => ({...prev, challenge}))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Challenge generation failed')
		} finally {
			setIsLoading(false)
		}
	}

	const testPerformance = async () => {
		setIsLoading(true)
		setError(null)

		try {
			const startTime = performance.now()
			await BinaryEncodingUtils.performanceTest()
			const endTime = performance.now()

			const results = `Performance test completed in ${(endTime - startTime).toFixed(2)}ms`
			setDemoResults((prev) => ({...prev, performanceResults: results}))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Performance test failed')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className='max-w-6xl mx-auto p-6 space-y-6'>
			<div className='bg-white rounded-lg shadow-md p-6'>
				<h1 className='text-3xl font-bold mb-6 text-gray-800'>Binary Encoding Demo for WebAssembly</h1>
				<p className='text-gray-600 mb-6'>This demo showcases the implementation of binary encoding using Uint8Array for optimized data transfer between JavaScript and WebAssembly.</p>

				{error && (
					<div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-md'>
						<p className='text-sm text-red-600'>{error}</p>
					</div>
				)}

				{/* Control Buttons */}
				<div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
					<button onClick={runDemo} disabled={isLoading} className='py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50'>
						{isLoading ? 'Running...' : 'Run Full Demo'}
					</button>

					<button onClick={testKeyGeneration} disabled={isLoading} className='py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50'>
						Generate Keys
					</button>

					<button onClick={testSigning} disabled={isLoading || !demoResults.keyPair} className='py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50'>
						Sign Message
					</button>

					<button onClick={testVerification} disabled={isLoading || !demoResults.signature} className='py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50'>
						Verify Signature
					</button>

					<button onClick={testHashing} disabled={isLoading} className='py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50'>
						Hash Message
					</button>

					<button onClick={testChallenge} disabled={isLoading} className='py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50'>
						Generate Challenge
					</button>

					<button onClick={testPerformance} disabled={isLoading} className='py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50'>
						Performance Test
					</button>
				</div>

				{/* Results Display */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					{/* Key Pair */}
					{demoResults.keyPair && (
						<div className='bg-gray-50 rounded-md p-4'>
							<h3 className='text-lg font-medium text-gray-900 mb-2'>Generated Key Pair</h3>
							<div className='space-y-2 text-sm'>
								<div>
									<span className='font-medium'>Private Key (hex):</span>
									<p className='break-all text-gray-600 mt-1'>{DIDCrypto.uint8ArrayToHex(demoResults.keyPair.privateKey)}</p>
								</div>
								<div>
									<span className='font-medium'>Public Key (hex):</span>
									<p className='break-all text-gray-600 mt-1'>{DIDCrypto.uint8ArrayToHex(demoResults.keyPair.publicKey)}</p>
								</div>
								<div>
									<span className='font-medium'>Private Key Length:</span>
									<span className='text-gray-600 ml-2'>{demoResults.keyPair.privateKey.length} bytes</span>
								</div>
								<div>
									<span className='font-medium'>Public Key Length:</span>
									<span className='text-gray-600 ml-2'>{demoResults.keyPair.publicKey.length} bytes</span>
								</div>
							</div>
						</div>
					)}

					{/* Signature */}
					{demoResults.signature && (
						<div className='bg-gray-50 rounded-md p-4'>
							<h3 className='text-lg font-medium text-gray-900 mb-2'>Signature</h3>
							<div className='space-y-2 text-sm'>
								<div>
									<span className='font-medium'>Signature (hex):</span>
									<p className='break-all text-gray-600 mt-1'>{DIDCrypto.uint8ArrayToHex(demoResults.signature)}</p>
								</div>
								<div>
									<span className='font-medium'>Length:</span>
									<span className='text-gray-600 ml-2'>{demoResults.signature.length} bytes</span>
								</div>
								<div>
									<span className='font-medium'>Type:</span>
									<span className='text-gray-600 ml-2'>Uint8Array (Binary)</span>
								</div>
							</div>
						</div>
					)}

					{/* Verification */}
					{demoResults.verification !== null && (
						<div className='bg-gray-50 rounded-md p-4'>
							<h3 className='text-lg font-medium text-gray-900 mb-2'>Verification Result</h3>
							<div className='space-y-2 text-sm'>
								<div className={`font-medium ${demoResults.verification ? 'text-green-600' : 'text-red-600'}`}>{demoResults.verification ? '✅ Signature Valid' : '❌ Signature Invalid'}</div>
								<div>
									<span className='font-medium'>Method:</span>
									<span className='text-gray-600 ml-2'>Binary WASM Verification</span>
								</div>
							</div>
						</div>
					)}

					{/* Hash */}
					{demoResults.hash && (
						<div className='bg-gray-50 rounded-md p-4'>
							<h3 className='text-lg font-medium text-gray-900 mb-2'>Hash Result</h3>
							<div className='space-y-2 text-sm'>
								<div>
									<span className='font-medium'>Hash (hex):</span>
									<p className='break-all text-gray-600 mt-1'>{DIDCrypto.uint8ArrayToHex(demoResults.hash)}</p>
								</div>
								<div>
									<span className='font-medium'>Length:</span>
									<span className='text-gray-600 ml-2'>{demoResults.hash.length} bytes</span>
								</div>
							</div>
						</div>
					)}

					{/* Challenge */}
					{demoResults.challenge && (
						<div className='bg-gray-50 rounded-md p-4'>
							<h3 className='text-lg font-medium text-gray-900 mb-2'>Random Challenge</h3>
							<div className='space-y-2 text-sm'>
								<div>
									<span className='font-medium'>Challenge (hex):</span>
									<p className='break-all text-gray-600 mt-1'>{DIDCrypto.uint8ArrayToHex(demoResults.challenge)}</p>
								</div>
								<div>
									<span className='font-medium'>Length:</span>
									<span className='text-gray-600 ml-2'>{demoResults.challenge.length} bytes</span>
								</div>
							</div>
						</div>
					)}

					{/* Performance */}
					{demoResults.performanceResults && (
						<div className='bg-gray-50 rounded-md p-4'>
							<h3 className='text-lg font-medium text-gray-900 mb-2'>Performance Test</h3>
							<div className='space-y-2 text-sm'>
								<p className='text-gray-600'>{demoResults.performanceResults}</p>
								<p className='text-xs text-gray-500'>Check browser console for detailed timing results</p>
							</div>
						</div>
					)}
				</div>

				{/* Console Logs */}
				{logs.length > 0 && (
					<div className='mt-8'>
						<h3 className='text-lg font-medium text-gray-900 mb-4'>Demo Console Output</h3>
						<div className='bg-black text-green-400 rounded-md p-4 font-mono text-sm max-h-96 overflow-y-auto'>
							{logs.map((log, index) => (
								<div key={index} className='mb-1'>
									{log}
								</div>
							))}
						</div>
						<button onClick={() => setLogs([])} className='mt-2 py-1 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'>
							Clear Logs
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
