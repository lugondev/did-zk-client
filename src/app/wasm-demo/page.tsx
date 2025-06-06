'use client'

import {useState, useEffect} from 'react'
import {wasmLoader} from '@/lib/wasm-loader'
import {cryptoWasm} from '@/lib/crypto-wasm'

export default function WASMDemo() {
	const [wasmStatus, setWasmStatus] = useState({
		crypto: false,
		did: false,
		loading: true,
		error: null as string | null,
	})

	const [demoResults, setDemoResults] = useState({
		keyPair: null as any,
		signature: null as Uint8Array | null,
		verification: null as boolean | null,
		didResult: null as any,
		authResult: null as any,
	})

	const [isRunning, setIsRunning] = useState(false)

	useEffect(() => {
		const initializeWASM = async () => {
			try {
				setWasmStatus((prev) => ({...prev, loading: true, error: null}))

				// Load both WASM modules
				await Promise.all([wasmLoader.loadCrypto(), wasmLoader.loadDID()])

				setWasmStatus({
					crypto: true,
					did: true,
					loading: false,
					error: null,
				})
			} catch (error) {
				console.error('Failed to initialize WASM modules:', error)
				setWasmStatus({
					crypto: false,
					did: false,
					loading: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				})
			}
		}

		initializeWASM()
	}, [])

	const runCryptoDemo = async () => {
		setIsRunning(true)
		try {
			// Generate key pair using binary encoding
			console.log('Generating key pair with binary encoding...')
			const keyPair = await cryptoWasm.generateKeyPair()
			setDemoResults((prev) => ({...prev, keyPair}))

			// Sign a message using binary data
			const message = 'Hello, WASM Crypto with Binary Encoding!'
			console.log('Signing message:', message)
			const messageBytes = cryptoWasm.stringToUint8Array(message)
			const signature = await cryptoWasm.signMessage(keyPair.privateKey, messageBytes)
			setDemoResults((prev) => ({...prev, signature}))

			// Verify signature using binary data
			console.log('Verifying signature with binary data...')
			const verification = await cryptoWasm.verifySignature(keyPair.publicKey, messageBytes, signature)
			setDemoResults((prev) => ({...prev, verification}))

			console.log('Crypto demo completed successfully with binary encoding!')
		} catch (error) {
			console.error('Crypto demo failed:', error)
			setWasmStatus((prev) => ({...prev, error: error instanceof Error ? error.message : 'Crypto demo failed'}))
		} finally {
			setIsRunning(false)
		}
	}

	const runDIDDemo = async () => {
		setIsRunning(true)
		try {
			// Create DID
			console.log('Creating DID...')
			const didResult = await wasmLoader.createDID()
			setDemoResults((prev) => ({...prev, didResult}))

			// Authenticate DID
			const challenge = 'demo-challenge-12345'
			console.log('Authenticating DID with challenge:', challenge)
			const authResult = await wasmLoader.authenticateDID(didResult.did.id, didResult.privateKey, challenge)
			setDemoResults((prev) => ({...prev, authResult}))

			console.log('DID demo completed successfully!')
		} catch (error) {
			console.error('DID demo failed:', error)
			setWasmStatus((prev) => ({...prev, error: error instanceof Error ? error.message : 'DID demo failed'}))
		} finally {
			setIsRunning(false)
		}
	}

	return (
		<div className='max-w-4xl mx-auto p-6 space-y-8'>
			<div className='text-center'>
				<h1 className='text-3xl font-bold text-gray-900 mb-2'>WebAssembly Integration Demo</h1>
				<p className='text-gray-600'>Demonstrating client-side cryptographic operations using Go WASM modules</p>
			</div>

			{/* WASM Status */}
			<div className='bg-white rounded-lg shadow-md p-6'>
				<h2 className='text-xl font-semibold mb-4'>WASM Module Status</h2>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					<div className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'>
						<div>
							<h3 className='font-medium'>Crypto Module</h3>
							<p className='text-sm text-gray-600'>Key generation, signing, verification</p>
						</div>
						<div className={`w-4 h-4 rounded-full ${wasmStatus.loading ? 'bg-yellow-400' : wasmStatus.crypto ? 'bg-green-400' : 'bg-red-400'}`} />
					</div>

					<div className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'>
						<div>
							<h3 className='font-medium'>DID Module</h3>
							<p className='text-sm text-gray-600'>DID creation, authentication, proofs</p>
						</div>
						<div className={`w-4 h-4 rounded-full ${wasmStatus.loading ? 'bg-yellow-400' : wasmStatus.did ? 'bg-green-400' : 'bg-red-400'}`} />
					</div>
				</div>

				{wasmStatus.loading && <div className='mt-4 text-center text-gray-600'>Loading WASM modules...</div>}

				{wasmStatus.error && (
					<div className='mt-4 p-4 bg-red-50 border border-red-200 rounded-lg'>
						<p className='text-red-600 text-sm'>{wasmStatus.error}</p>
					</div>
				)}
			</div>

			{/* Integration Benefits */}
			<div className='bg-white rounded-lg shadow-md p-6'>
				<h2 className='text-xl font-semibold mb-4'>Integration Benefits</h2>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					<div className='space-y-4'>
						<h3 className='font-medium text-green-700'>✓ Before (JavaScript)</h3>
						<ul className='text-sm text-gray-600 space-y-2'>
							<li>• HTTP requests to backend API</li>
							<li>• Network latency for each operation</li>
							<li>• JavaScript crypto libraries (tweetnacl)</li>
							<li>• Server-side key management</li>
							<li>• Multiple round trips for complex operations</li>
						</ul>
					</div>

					<div className='space-y-4'>
						<h3 className='font-medium text-blue-700'>✓ After (WASM)</h3>
						<ul className='text-sm text-gray-600 space-y-2'>
							<li>• Native Go crypto operations in browser</li>
							<li>• Zero network latency for crypto ops</li>
							<li>• Same crypto library as backend (gnark-crypto)</li>
							<li>• Client-side key management</li>
							<li>• Batched operations with single function calls</li>
						</ul>
					</div>
				</div>
			</div>

			{/* Demo Controls */}
			<div className='bg-white rounded-lg shadow-md p-6'>
				<h2 className='text-xl font-semibold mb-4'>Live Demonstrations</h2>

				<div className='space-y-4'>
					<button onClick={runCryptoDemo} disabled={!wasmStatus.crypto || isRunning} className='w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'>
						{isRunning ? 'Running...' : 'Run Crypto Demo (Key Generation + Signing)'}
					</button>

					<button onClick={runDIDDemo} disabled={!wasmStatus.did || isRunning} className='w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'>
						{isRunning ? 'Running...' : 'Run DID Demo (Creation + Authentication)'}
					</button>
				</div>
			</div>

			{/* Demo Results */}
			{(demoResults.keyPair || demoResults.didResult) && (
				<div className='bg-white rounded-lg shadow-md p-6'>
					<h2 className='text-xl font-semibold mb-4'>Demo Results</h2>

					<div className='space-y-6'>
						{demoResults.keyPair && (
							<div>
								<h3 className='font-medium mb-2'>Crypto Operations</h3>
								<div className='bg-gray-50 rounded-lg p-4 space-y-2'>
									<div>
										<span className='font-medium'>Public Key (hex):</span>
										<code className='block text-xs mt-1 p-2 bg-white rounded border break-all'>{cryptoWasm.uint8ArrayToHex(demoResults.keyPair.publicKey)}</code>
									</div>
									<div>
										<span className='font-medium'>Private Key (hex, truncated):</span>
										<code className='block text-xs mt-1 p-2 bg-white rounded border break-all'>{cryptoWasm.uint8ArrayToHex(demoResults.keyPair.privateKey).substring(0, 32)}...</code>
									</div>
									<div>
										<span className='font-medium'>Key Type:</span>
										<span className='ml-2 px-2 py-1 rounded text-xs bg-purple-100 text-purple-700'>Uint8Array (Binary)</span>
									</div>
									{demoResults.signature && (
										<div>
											<span className='font-medium'>Signature (hex):</span>
											<code className='block text-xs mt-1 p-2 bg-white rounded border break-all'>{cryptoWasm.uint8ArrayToHex(demoResults.signature)}</code>
										</div>
									)}
									{demoResults.signature && (
										<div>
											<span className='font-medium'>Signature Type:</span>
											<span className='ml-2 px-2 py-1 rounded text-xs bg-purple-100 text-purple-700'>Uint8Array (Binary)</span>
										</div>
									)}
									{demoResults.verification !== null && (
										<div>
											<span className='font-medium'>Verification:</span>
											<span className={`ml-2 px-2 py-1 rounded text-xs ${demoResults.verification ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{demoResults.verification ? 'Valid' : 'Invalid'}</span>
										</div>
									)}
								</div>
							</div>
						)}

						{demoResults.didResult && (
							<div>
								<h3 className='font-medium mb-2'>DID Operations</h3>
								<div className='bg-gray-50 rounded-lg p-4 space-y-2'>
									<div>
										<span className='font-medium'>DID ID:</span>
										<code className='block text-xs mt-1 p-2 bg-white rounded border break-all'>{demoResults.didResult.did.id}</code>
									</div>
									<div>
										<span className='font-medium'>DID Public Key:</span>
										<code className='block text-xs mt-1 p-2 bg-white rounded border break-all'>{demoResults.didResult.did.publicKey}</code>
									</div>
									{demoResults.authResult && (
										<>
											<div>
												<span className='font-medium'>Authentication Proof:</span>
												<code className='block text-xs mt-1 p-2 bg-white rounded border break-all'>{demoResults.authResult.proof}</code>
											</div>
											<div>
												<span className='font-medium'>Authentication Signature:</span>
												<code className='block text-xs mt-1 p-2 bg-white rounded border break-all'>{demoResults.authResult.signature}</code>
											</div>
										</>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Code Examples */}
			<div className='bg-white rounded-lg shadow-md p-6'>
				<h2 className='text-xl font-semibold mb-4'>Code Examples</h2>

				<div className='space-y-4'>
					<div>
						<h3 className='font-medium mb-2'>Before (API Calls):</h3>
						<pre className='bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto'>
							{`// Old approach - API calls
const response = await fetch('/api/did/create', {
  method: 'POST',
  body: JSON.stringify(formData)
});
const result = await response.json();`}
						</pre>
					</div>

					<div>
						<h3 className='font-medium mb-2'>After (WASM with Binary Encoding):</h3>
						<pre className='bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto'>
							{`// New approach - Direct WASM calls with binary data
import { cryptoWasm } from '@/lib/crypto-wasm';

// Generate key pair (returns Uint8Array)
const keyPair = await cryptoWasm.generateKeyPair();

// Sign message with binary data
const messageBytes = cryptoWasm.stringToUint8Array(message);
const signature = await cryptoWasm.signMessage(keyPair.privateKey, messageBytes);

// Verify with binary data
const isValid = await cryptoWasm.verifySignature(keyPair.publicKey, messageBytes, signature);`}
						</pre>
					</div>
				</div>
			</div>
		</div>
	)
}
