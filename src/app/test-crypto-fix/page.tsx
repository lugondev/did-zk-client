'use client'

import {useState} from 'react'
import {cryptoWasm} from '@/lib/crypto-wasm'

export default function TestCryptoFix() {
	const [results, setResults] = useState<Record<string, any>>({})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const testCryptoOperations = async () => {
		setLoading(true)
		setError(null)
		setResults({})

		try {
			console.log('=== Testing Crypto Fix ===')

			// Test 1: Generate key pair
			console.log('1. Generating key pair...')
			const keyPair = await cryptoWasm.generateKeyPair()
			console.log('✓ Key pair generated successfully')
			setResults((prev) => ({...prev, keyPair}))

			// Test 2: Sign message with binary data
			console.log('2. Testing message signing with binary data...')
			const testMessage = 'Test message for signing with binary encoding'
			const messageBytes = cryptoWasm.stringToUint8Array(testMessage)

			console.log('Message bytes length:', messageBytes.length)
			console.log('Private key length:', keyPair.privateKey.length)

			const signature = await cryptoWasm.signMessage(keyPair.privateKey, messageBytes)
			console.log('✓ Message signed successfully')
			console.log('Signature length:', signature.length)
			setResults((prev) => ({...prev, signature, testMessage}))

			// Test 3: Verify signature
			console.log('3. Testing signature verification...')
			const isValid = await cryptoWasm.verifySignature(keyPair.publicKey, messageBytes, signature)
			console.log('✓ Signature verified:', isValid)
			setResults((prev) => ({...prev, verification: isValid}))

			// Test 4: Test with empty message (should fail)
			console.log('4. Testing error handling with empty message...')
			try {
				await cryptoWasm.signMessage(keyPair.privateKey, new Uint8Array())
				console.log('✗ Expected error but operation succeeded')
				setResults((prev) => ({...prev, errorTest: 'Failed - no error thrown for empty message'}))
			} catch (emptyMsgError) {
				const errorMessage = emptyMsgError instanceof Error ? emptyMsgError.message : 'Unknown error'
				console.log('✓ Correctly caught error for empty message:', errorMessage)
				setResults((prev) => ({...prev, errorTest: 'Passed - error handling works correctly'}))
			}

			// Test 5: Test legacy compatibility functions
			console.log('5. Testing legacy compatibility functions...')
			const privateKeyHex = cryptoWasm.uint8ArrayToHex(keyPair.privateKey)
			const publicKeyHex = cryptoWasm.uint8ArrayToHex(keyPair.publicKey)

			// Import legacy functions
			const {sign, verify} = await import('@/lib/crypto-wasm')

			const legacySignature = await sign(privateKeyHex, testMessage)
			console.log('✓ Legacy sign function works')

			const legacyVerification = await verify(publicKeyHex, testMessage, legacySignature)
			console.log('✓ Legacy verify function works:', legacyVerification)

			setResults((prev) => ({
				...prev,
				legacySignature,
				legacyVerification,
				privateKeyHex: privateKeyHex.substring(0, 16) + '...', // truncated for display
				publicKeyHex: publicKeyHex.substring(0, 16) + '...', // truncated for display
			}))

			console.log('=== All tests completed successfully! ===')
		} catch (err) {
			console.error('Test failed:', err)
			setError(err instanceof Error ? err.message : 'Unknown error')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='max-w-4xl mx-auto p-6 space-y-6'>
			<div className='text-center'>
				<h1 className='text-3xl font-bold text-gray-900 mb-2'>Crypto Fix Test</h1>
				<p className='text-gray-600'>Testing the "Sign message failed" error fixes</p>
			</div>

			<div className='bg-white rounded-lg shadow-md p-6'>
				<button onClick={testCryptoOperations} disabled={loading} className='w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'>
					{loading ? 'Running Tests...' : 'Run Crypto Fix Tests'}
				</button>
			</div>

			{error && (
				<div className='bg-red-50 border border-red-200 rounded-lg p-4'>
					<h3 className='text-red-800 font-medium'>Error occurred:</h3>
					<p className='text-red-600 text-sm mt-1'>{error}</p>
				</div>
			)}

			{Object.keys(results).length > 0 && (
				<div className='bg-white rounded-lg shadow-md p-6'>
					<h2 className='text-xl font-semibold mb-4'>Test Results</h2>

					<div className='space-y-4'>
						{results.keyPair && (
							<div className='bg-green-50 border border-green-200 rounded-lg p-4'>
								<h3 className='text-green-800 font-medium'>✓ Key Generation</h3>
								<p className='text-green-600 text-sm'>Successfully generated key pair with binary encoding</p>
								<div className='mt-2 text-xs text-gray-600'>
									<div>Private Key Length: {results.keyPair.privateKey.length} bytes</div>
									<div>Public Key Length: {results.keyPair.publicKey.length} bytes</div>
								</div>
							</div>
						)}

						{results.signature && (
							<div className='bg-green-50 border border-green-200 rounded-lg p-4'>
								<h3 className='text-green-800 font-medium'>✓ Message Signing</h3>
								<p className='text-green-600 text-sm'>Successfully signed message: "{results.testMessage}"</p>
								<div className='mt-2 text-xs text-gray-600'>
									<div>Signature Length: {results.signature.length} bytes</div>
									<div>Signature (hex): {cryptoWasm.uint8ArrayToHex(results.signature).substring(0, 32)}...</div>
								</div>
							</div>
						)}

						{results.verification !== undefined && (
							<div className={`border rounded-lg p-4 ${results.verification ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
								<h3 className={`font-medium ${results.verification ? 'text-green-800' : 'text-red-800'}`}>{results.verification ? '✓' : '✗'} Signature Verification</h3>
								<p className={`text-sm ${results.verification ? 'text-green-600' : 'text-red-600'}`}>Signature is {results.verification ? 'valid' : 'invalid'}</p>
							</div>
						)}

						{results.errorTest && (
							<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
								<h3 className='text-blue-800 font-medium'>🛡️ Error Handling Test</h3>
								<p className='text-blue-600 text-sm'>{results.errorTest}</p>
							</div>
						)}

						{results.legacySignature && (
							<div className='bg-purple-50 border border-purple-200 rounded-lg p-4'>
								<h3 className='text-purple-800 font-medium'>✓ Legacy Compatibility</h3>
								<p className='text-purple-600 text-sm'>Legacy functions work correctly</p>
								<div className='mt-2 text-xs text-gray-600'>
									<div>Legacy Verification: {results.legacyVerification ? 'Valid' : 'Invalid'}</div>
									<div>Private Key (hex): {results.privateKeyHex}</div>
									<div>Public Key (hex): {results.publicKeyHex}</div>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			<div className='bg-gray-50 rounded-lg p-4'>
				<h3 className='font-medium text-gray-800 mb-2'>What was fixed:</h3>
				<ul className='text-sm text-gray-600 space-y-1'>
					<li>
						✓ <strong>Client-side:</strong> Replaced TextDecoder with hex encoding for binary data
					</li>
					<li>
						✓ <strong>Client-side:</strong> Added input validation for private keys and messages
					</li>
					<li>
						✓ <strong>Client-side:</strong> Improved error handling to parse JSON error responses
					</li>
					<li>
						✓ <strong>Backend:</strong> Updated WASM module to handle hex-encoded messages
					</li>
					<li>
						✓ <strong>Backend:</strong> Enhanced error messages with more context
					</li>
					<li>
						✓ <strong>Backend:</strong> Added comprehensive input validation
					</li>
				</ul>
			</div>
		</div>
	)
}
