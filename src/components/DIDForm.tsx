import {useState} from 'react'
import {createDID, authenticateDID, verifyDID} from '../app/api/did'
import type {DID} from '../app/api/did'

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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			setError(null)
			const response = await createDID(formData)
			setDidInfo(response)
			// Reset other states when creating new DID
			setAuthenticationState({challenge: '', proof: '', signature: ''})
			setVerificationResult(null)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create DID')
		}
	}

	const handleAuthenticate = async () => {
		if (!didInfo || !authenticationState.challenge) return
		console.log('didInfo', JSON.stringify(didInfo, null, 2))
		console.log('authenticationState', authenticationState)
		try {
			setError(null)
			const response = await authenticateDID(didInfo.did.ID, didInfo.privateKey, authenticationState.challenge)
			console.log('Authentication response:', response)

			setAuthenticationState((prev) => ({
				...prev,
				proof: response.proof,
				signature: response.signature || '',
			}))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to authenticate DID')
		}
	}

	const handleVerify = async () => {
		console.log('authenticationState', authenticationState)

		if (!didInfo || !authenticationState.challenge || !authenticationState.proof) return
		try {
			setError(null)
			const isValid = await verifyDID(didInfo.did.ID, authenticationState.signature, authenticationState.proof)
			setVerificationResult(isValid)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to verify DID')
		}
	}

	return (
		<div className='max-w-md mx-auto p-6 bg-white rounded-lg shadow-md'>
			<h2 className='text-2xl font-bold mb-6 text-gray-800'>DID Management</h2>

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

				<button type='submit' className='w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'>
					Create DID
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
						<button onClick={handleAuthenticate} disabled={!authenticationState.challenge} className='w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50'>
							Authenticate
						</button>

						{authenticationState.proof && (
							<button onClick={handleVerify} className='w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'>
								Verify Authentication
							</button>
						)}
					</div>

					{verificationResult !== null && <p className={`mt-2 text-sm ${verificationResult ? 'text-green-600' : 'text-red-600'}`}>Verification {verificationResult ? 'successful' : 'failed'}</p>}
				</div>
			)}
		</div>
	)
}
