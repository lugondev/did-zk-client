import {useState, useEffect} from 'react'
import {createDID, authenticateDID, verifyDID, batchCreateDIDAndIssueCredential, batchAuthenticateAndVerifyDID, shouldUseBatching, DIDCrypto, authenticateDIDBinary, verifyDIDBinary} from '../app/api/did'
import type {DID} from '../app/api/did'
import {wasmLoader} from '../lib/wasm-loader'

export default function DIDForm() {
	const [formData, setFormData] = useState({
		name: 'lugon',
		dob: '2000-01-01',
	})

	const [didInfo, setDidInfo] = useState<{
		did: DID
		privateKey: string
	} | null>(null)

	const [authenticationState, setAuthenticationState] = useState({
		challenge: 'xxxxxxxx',
		proof: '',
		signature: '',
	})

	const [verificationResult, setVerificationResult] = useState<boolean | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [useBatching, setUseBatching] = useState<boolean>(shouldUseBatching())
	const [useBinaryEncoding, setUseBinaryEncoding] = useState<boolean>(true)
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [wasmStatus, setWasmStatus] = useState<{
		crypto: boolean
		did: boolean
		loading: boolean
	}>({crypto: false, did: false, loading: true})

	// Initialize WASM modules on component mount
	useEffect(() => {
		const initializeWASM = async () => {
			try {
				setWasmStatus((prev) => ({...prev, loading: true}))

				// Load both WASM modules
				await Promise.all([wasmLoader.loadCrypto(), wasmLoader.loadDID()])

				setWasmStatus({
					crypto: true,
					did: true,
					loading: false,
				})
			} catch (error) {
				console.error('Failed to initialize WASM modules:', error)
				setWasmStatus({
					crypto: false,
					did: false,
					loading: false,
				})
				setError('Failed to initialize WASM modules. Please refresh the page.')
			}
		}

		initializeWASM()
	}, [])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		try {
			setError(null)

			if (useBatching) {
				// Use batch operation to create DID and issue credential
				const response = await batchCreateDIDAndIssueCredential({
					name: formData.name,
					dob: formData.dob,
				})

				if (response.success) {
					setDidInfo({
						did: response.did,
						privateKey: response.privateKey,
					})
					// Reset other states when creating new DID
					setAuthenticationState({challenge: 'xxxxxxxx', proof: '', signature: ''})
					setVerificationResult(null)
				} else {
					throw new Error(response.message || 'Batch operation failed')
				}
			} else {
				// Use individual operation
				const response = await createDID(formData)
				setDidInfo(response)
				// Reset other states when creating new DID
				setAuthenticationState({challenge: 'xxxxxxxx', proof: '', signature: ''})
				setVerificationResult(null)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create DID')
		} finally {
			setIsLoading(false)
		}
	}

	const handleAuthenticate = async () => {
		if (!didInfo || !authenticationState.challenge) return
		setIsLoading(true)
		console.log('didInfo', JSON.stringify(didInfo, null, 2))
		console.log('authenticationState', authenticationState)
		console.log('useBinaryEncoding', useBinaryEncoding)
		try {
			setError(null)

			if (useBatching) {
				// Use batch operation to authenticate and verify
				const response = await batchAuthenticateAndVerifyDID({
					didId: didInfo.did.ID,
					privateKey: didInfo.privateKey,
					challenge: authenticationState.challenge,
				})

				console.log('Batch auth and verify response:', response)

				if (response.success) {
					setAuthenticationState((prev) => ({
						...prev,
						proof: response.proof,
						signature: response.signature,
					}))
					setVerificationResult(response.verified)
				} else {
					throw new Error(response.message || 'Batch authentication failed')
				}
			} else if (useBinaryEncoding) {
				// Use binary encoding for optimized data transfer
				const privateKeyBytes = DIDCrypto.hexToUint8Array(didInfo.privateKey)
				const challengeBytes = DIDCrypto.stringToUint8Array(authenticationState.challenge)

				const response = await authenticateDIDBinary(didInfo.did.ID, privateKeyBytes, challengeBytes)
				console.log('Binary authentication response:', response)

				setAuthenticationState((prev) => ({
					...prev,
					proof: response.proof,
					signature: DIDCrypto.uint8ArrayToHex(response.signature),
				}))
			} else {
				// Use individual authentication operation with string encoding
				const response = await authenticateDID(didInfo.did.ID, didInfo.privateKey, authenticationState.challenge)
				console.log('Authentication response:', response)

				setAuthenticationState((prev) => ({
					...prev,
					proof: response.proof,
					signature: response.signature || '',
				}))
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to authenticate DID')
		} finally {
			setIsLoading(false)
		}
	}

	const handleVerify = async () => {
		console.log('authenticationState', authenticationState)
		console.log('useBinaryEncoding', useBinaryEncoding)

		if (!didInfo || !authenticationState.challenge || !authenticationState.proof) return
		setIsLoading(true)
		try {
			setError(null)

			if (useBinaryEncoding) {
				// Use binary encoding for verification
				const signatureBytes = DIDCrypto.hexToUint8Array(authenticationState.signature)
				const isValid = await verifyDIDBinary(didInfo.did.ID, signatureBytes, authenticationState.proof)
				setVerificationResult(isValid)
			} else {
				// Use string encoding for verification
				const isValid = await verifyDID(didInfo.did.ID, authenticationState.signature, authenticationState.proof)
				setVerificationResult(isValid)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to verify DID')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className='max-w-md mx-auto p-6 bg-white rounded-lg shadow-md'>
			<h2 className='text-2xl font-bold mb-6 text-gray-800'>DID Management</h2>

			{/* WASM Status */}
			<div className='mb-6 p-4 bg-green-50 border border-green-200 rounded-md'>
				<div className='flex items-center justify-between'>
					<div>
						<h3 className='text-sm font-medium text-green-900'>WebAssembly Integration</h3>
						<p className='text-xs text-green-700 mt-1'>{wasmStatus.loading ? 'Loading WASM modules...' : wasmStatus.crypto && wasmStatus.did ? 'Using native WASM crypto & DID operations' : 'WASM modules failed to load'}</p>
					</div>
					<div className={`w-3 h-3 rounded-full ${wasmStatus.loading ? 'bg-yellow-400' : wasmStatus.crypto && wasmStatus.did ? 'bg-green-400' : 'bg-red-400'}`} />
				</div>
			</div>

			{/* Batching Toggle */}
			<div className='mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md'>
				<div className='flex items-center justify-between'>
					<div>
						<h3 className='text-sm font-medium text-blue-900'>WASM Operation Batching</h3>
						<p className='text-xs text-blue-700 mt-1'>{useBatching ? 'Combining WASM operations for better performance' : 'Using individual WASM calls'}</p>
					</div>
					<label className='flex items-center cursor-pointer'>
						<input type='checkbox' checked={useBatching} onChange={(e) => setUseBatching(e.target.checked)} className='sr-only' />
						<div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useBatching ? 'bg-blue-600' : 'bg-gray-200'}`}>
							<span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useBatching ? 'translate-x-6' : 'translate-x-1'}`} />
						</div>
					</label>
				</div>
			</div>

			{/* Binary Encoding Toggle */}
			<div className='mb-6 p-4 bg-purple-50 border border-purple-200 rounded-md'>
				<div className='flex items-center justify-between'>
					<div>
						<h3 className='text-sm font-medium text-purple-900'>Binary Data Encoding</h3>
						<p className='text-xs text-purple-700 mt-1'>{useBinaryEncoding ? 'Using Uint8Array for optimized data transfer' : 'Using string encoding for compatibility'}</p>
					</div>
					<label className='flex items-center cursor-pointer'>
						<input type='checkbox' checked={useBinaryEncoding} onChange={(e) => setUseBinaryEncoding(e.target.checked)} className='sr-only' disabled={useBatching} />
						<div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useBinaryEncoding && !useBatching ? 'bg-purple-600' : 'bg-gray-200'} ${useBatching ? 'opacity-50 cursor-not-allowed' : ''}`}>
							<span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useBinaryEncoding && !useBatching ? 'translate-x-6' : 'translate-x-1'}`} />
						</div>
					</label>
				</div>
				{useBatching && <p className='text-xs text-purple-600 mt-2'>Binary encoding is disabled when batching is enabled</p>}
			</div>

			<form onSubmit={handleSubmit} className='space-y-4'>
				<div>
					<label htmlFor='name' className='block text-sm font-medium text-gray-700'>
						Name
					</label>
					<input type='text' id='name' value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500' required />
				</div>

				<div>
					<label htmlFor='dob' className='block text-sm font-medium text-gray-700'>
						Date of Birth
					</label>
					<input type='date' id='dob' value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500' required />
				</div>

				<button type='submit' disabled={isLoading || wasmStatus.loading || !(wasmStatus.crypto && wasmStatus.did)} className='w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed'>
					{isLoading ? (
						<div className='flex items-center justify-center'>
							<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
							{useBatching ? 'Creating DID & Issuing Credential (WASM)...' : 'Creating DID (WASM)...'}
						</div>
					) : wasmStatus.loading ? (
						'Loading WASM...'
					) : !(wasmStatus.crypto && wasmStatus.did) ? (
						'WASM Not Available'
					) : useBatching ? (
						'Create DID & Issue Credential (WASM)'
					) : (
						'Create DID (WASM)'
					)}
				</button>
			</form>

			{error && (
				<div className='mt-4 p-4 bg-red-50 border border-red-200 rounded-md'>
					<p className='text-sm text-red-600'>{error}</p>
				</div>
			)}

			{didInfo && (
				<div className='mt-6 p-4 bg-gray-50 rounded-md space-y-4'>
					<h3 className='text-lg font-medium text-gray-900'>DID Information</h3>
					<p className='text-sm text-gray-500 break-all'>DID ID: {didInfo.did.ID}</p>
					<p className='text-sm text-gray-500 break-all'>Private Key: {didInfo.privateKey}</p>

					<div className='space-y-2'>
						<label htmlFor='challenge' className='block text-sm font-medium text-gray-700'>
							Authentication Challenge
						</label>
						<input type='text' id='challenge' value={authenticationState.challenge} onChange={(e) => setAuthenticationState((prev) => ({...prev, challenge: e.target.value}))} placeholder='Enter a challenge message' className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500' />
					</div>

					<div className='space-y-2'>
						<button onClick={handleAuthenticate} disabled={!authenticationState.challenge || isLoading || !(wasmStatus.crypto && wasmStatus.did)} className='w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'>
							{isLoading ? (
								<div className='flex items-center justify-center'>
									<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
									{useBatching ? 'Authenticating & Verifying (WASM)...' : useBinaryEncoding ? 'Authenticating (Binary WASM)...' : 'Authenticating (WASM)...'}
								</div>
							) : useBatching ? (
								'Authenticate & Verify (WASM)'
							) : useBinaryEncoding ? (
								'Authenticate (Binary WASM)'
							) : (
								'Authenticate (WASM)'
							)}
						</button>

						{authenticationState.proof && !useBatching && (
							<button onClick={handleVerify} disabled={isLoading} className='w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed'>
								{isLoading ? (
									<div className='flex items-center justify-center'>
										<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
										{useBinaryEncoding ? 'Verifying (Binary)...' : 'Verifying...'}
									</div>
								) : useBinaryEncoding ? (
									'Verify Authentication (Binary)'
								) : (
									'Verify Authentication'
								)}
							</button>
						)}
					</div>

					{verificationResult !== null && (
						<div className='mt-2'>
							<p className={`text-sm ${verificationResult ? 'text-green-600' : 'text-red-600'}`}>Verification {verificationResult ? 'successful' : 'failed'}</p>
							{useBatching && verificationResult && <p className='text-xs text-blue-600 mt-1'>✓ Completed using batch authentication & verification</p>}
						</div>
					)}

					{useBatching && didInfo && (
						<div className='mt-4 p-3 bg-green-50 border border-green-200 rounded-md'>
							<p className='text-xs text-green-700'>
								<span className='font-medium'>WASM Batch Operation:</span> DID creation and credential issuance completed using native WebAssembly
							</p>
						</div>
					)}

					{wasmStatus.crypto && wasmStatus.did && didInfo && (
						<div className='mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md'>
							<p className='text-xs text-purple-700'>
								<span className='font-medium'>✓ WASM Integration:</span> All cryptographic operations running natively in WebAssembly for enhanced security and performance
							</p>
						</div>
					)}

					{useBinaryEncoding && !useBatching && didInfo && (
						<div className='mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-md'>
							<p className='text-xs text-indigo-700'>
								<span className='font-medium'>⚡ Binary Encoding:</span> Using Uint8Array for optimized data transfer between JavaScript and WebAssembly
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
