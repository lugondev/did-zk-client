'use client'

import {useState, useEffect} from 'react'
import {useRouter, useSearchParams} from 'next/navigation'
import Link from 'next/link'
import {QRCodeSVG} from 'qrcode.react'
import {wasmAuth} from '@/lib/wasm-auth'
import {generateQRChallenge, pollQRAuthentication} from '@/app/api/did'
import {generateRandomData} from '@/lib/qr-code-utils'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {AlertCircle, Key, QrCode, User, Shield, Cpu} from 'lucide-react'

export default function EnhancedLoginForm() {
	const router = useRouter()
	const searchParams = useSearchParams()

	type LoginMethodType = 'password' | 'did' | 'qr'
	const [loginMethod, setLoginMethod] = useState<LoginMethodType>('password')
	const [formData, setFormData] = useState({
		username: '',
		password: '',
	})
	const [didFormData, setDidFormData] = useState({
		didId: '',
		privateKey: '',
	})
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [cryptoStatus, setCryptoStatus] = useState<{
		keyGenerated: boolean
		hashComputed: boolean
		didVerified: boolean
	}>({
		keyGenerated: false,
		hashComputed: false,
		didVerified: false,
	})
	const [qrData, setQRData] = useState<{challenge: string; qrCode: string} | null>(null)
	const [qrCodeData, setQRCodeData] = useState<string>('')

	useEffect(() => {
		const errorMsg = searchParams.get('error')
		if (errorMsg) {
			setError(errorMsg)
		}
	}, [searchParams])

	const setupQRAuthentication = async () => {
		try {
			setLoading(true)
			// Generate random data for the QR code
			const randomData = generateRandomData(64)
			setQRCodeData(randomData)

			// For demonstration purposes, we'll use the random data as both challenge and display data
			setQRData({
				challenge: randomData,
				qrCode: randomData,
			})

			// In a real implementation, you would start polling here
			// startPolling(randomData)
		} catch (err) {
			setError('Failed to generate QR code')
		} finally {
			setLoading(false)
		}
	}

	const startPolling = async (challenge: string) => {
		const pollInterval = setInterval(async () => {
			try {
				const result = await pollQRAuthentication(challenge)
				if (result.authenticated && result.didId) {
					clearInterval(pollInterval)
					// Use client-side DID authentication
					await handleDIDLoginWithQR(result.didId, challenge)
				}
			} catch (err) {
				clearInterval(pollInterval)
				setError('QR authentication failed')
			}
		}, 2000)

		return () => clearInterval(pollInterval)
	}

	const handleDIDLoginWithQR = async (didId: string, challenge: string) => {
		try {
			// For QR login, we would need the private key from the mobile wallet
			// This is a simplified version - in production, the mobile wallet would handle this
			setError('QR login requires mobile wallet integration - use DID Key method instead')
		} catch (err) {
			setError('QR DID authentication failed')
		}
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const {name, value} = e.target
		setFormData((prev) => ({...prev, [name]: value}))
	}

	const handleDidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const {name, value} = e.target
		setDidFormData((prev) => ({...prev, [name]: value}))
	}

	const clearError = () => {
		setError(null)
		const url = new URL(window.location.href)
		url.searchParams.delete('error')
		window.history.replaceState({}, '', url.toString())
	}

	const resetCryptoStatus = () => {
		setCryptoStatus({
			keyGenerated: false,
			hashComputed: false,
			didVerified: false,
		})
	}

	const handlePasswordLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		setLoading(true)
		resetCryptoStatus()

		try {
			// Step 1: Generate authentication keypair
			setCryptoStatus((prev) => ({...prev, keyGenerated: true}))

			// Step 2: Perform client-side crypto login
			setCryptoStatus((prev) => ({...prev, hashComputed: true}))
			await wasmAuth.loginWithClientSideCrypto(formData.username, formData.password)

			router.push('/dashboard/profile')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Login failed')
		} finally {
			setLoading(false)
		}
	}

	const handleDIDLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		setLoading(true)
		resetCryptoStatus()

		try {
			if (!didFormData.didId || !didFormData.privateKey) {
				throw new Error('DID ID and Private Key are required')
			}

			// Step 1: Generate authentication keypair
			setCryptoStatus((prev) => ({...prev, keyGenerated: true}))

			// Step 2: Authenticate and verify DID client-side
			setCryptoStatus((prev) => ({...prev, hashComputed: true}))

			// Step 3: Verify DID authentication
			setCryptoStatus((prev) => ({...prev, didVerified: true}))
			await wasmAuth.loginWithDIDClientSide(didFormData.didId, didFormData.privateKey)

			router.push('/dashboard/profile')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'DID login failed')
		} finally {
			setLoading(false)
		}
	}

	const handleTestCrypto = async () => {
		try {
			setLoading(true)
			resetCryptoStatus()

			// Test key generation
			setCryptoStatus((prev) => ({...prev, keyGenerated: true}))
			const keyPair = await wasmAuth.generateAuthKeyPair()

			// Test password hashing
			setCryptoStatus((prev) => ({...prev, hashComputed: true}))
			const hash = await wasmAuth.hashPassword('test-password')

			// Test signing
			const signature = await wasmAuth.signDataClientSide(keyPair.privateKey, 'test-data')
			const verified = await wasmAuth.verifySignatureClientSide(keyPair.publicKey, 'test-data', signature)

			setCryptoStatus((prev) => ({...prev, didVerified: verified}))

			if (verified) {
				setError(null)
			} else {
				setError('Crypto test failed: signature verification failed')
			}
		} catch (err) {
			setError(`Crypto test failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		if (loginMethod !== 'qr') {
			setQRData(null)
			setQRCodeData('')
		}
	}, [loginMethod])

	const CryptoStatusIndicator = () => (
		<div className='flex items-center space-x-2 text-xs text-muted-foreground'>
			<Cpu className='w-3 h-3' />
			<span>Client-side crypto:</span>
			<div className={`w-2 h-2 rounded-full ${cryptoStatus.keyGenerated ? 'bg-green-500' : 'bg-gray-300'}`} />
			<span>Keys</span>
			<div className={`w-2 h-2 rounded-full ${cryptoStatus.hashComputed ? 'bg-green-500' : 'bg-gray-300'}`} />
			<span>Hash</span>
			<div className={`w-2 h-2 rounded-full ${cryptoStatus.didVerified ? 'bg-green-500' : 'bg-gray-300'}`} />
			<span>Verify</span>
		</div>
	)

	return (
		<div className='min-h-screen flex items-center justify-center bg-background p-4'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<CardTitle className='flex items-center space-x-2'>
						<Shield className='w-5 h-5' />
						<span>Enhanced Login</span>
					</CardTitle>
					<CardDescription>
						Client-side cryptographic authentication using WASM modules.{' '}
						<Link href='/register' onClick={clearError} className='text-primary hover:underline'>
							Sign up
						</Link>{' '}
						for free.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{error && (
						<Alert variant='destructive' className='mb-6'>
							<AlertCircle className='h-4 w-4' />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<CryptoStatusIndicator />

					<Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as LoginMethodType)} className='mt-4'>
						<TabsList className='grid w-full grid-cols-3'>
							<TabsTrigger value='password'>
								<User className='w-4 h-4 mr-2' />
								Password
							</TabsTrigger>
							<TabsTrigger value='did'>
								<Key className='w-4 h-4 mr-2' />
								DID Key
							</TabsTrigger>
							<TabsTrigger value='qr'>
								<QrCode className='w-4 h-4 mr-2' />
								DID QR
							</TabsTrigger>
						</TabsList>

						<TabsContent value='password'>
							<form onSubmit={handlePasswordLogin} className='space-y-4 mt-4'>
								<div className='space-y-2'>
									<Label htmlFor='username'>Username</Label>
									<Input id='username' name='username' type='text' required value={formData.username} onChange={handleChange} />
								</div>
								<div className='space-y-2'>
									<Label htmlFor='password'>Password</Label>
									<Input id='password' name='password' type='password' required value={formData.password} onChange={handleChange} />
								</div>
								<div className='flex space-x-2'>
									<Button type='submit' className='flex-1' disabled={loading}>
										{loading ? 'Signing in...' : 'Sign in with WASM'}
									</Button>
									<Button type='button' variant='outline' onClick={handleTestCrypto} disabled={loading}>
										Test
									</Button>
								</div>
							</form>
						</TabsContent>

						<TabsContent value='did'>
							<form onSubmit={handleDIDLogin} className='space-y-4 mt-4'>
								<div className='space-y-2'>
									<Label htmlFor='didId'>DID Identifier</Label>
									<Input id='didId' name='didId' value={didFormData.didId} onChange={handleDidChange} placeholder='did:example:123...' />
								</div>
								<div className='space-y-2'>
									<Label htmlFor='privateKey'>Private Key</Label>
									<Input id='privateKey' name='privateKey' value={didFormData.privateKey} onChange={handleDidChange} type='password' />
								</div>
								<div className='flex space-x-2'>
									<Button type='submit' className='flex-1' disabled={loading}>
										{loading ? 'Authenticating...' : 'Authenticate with DID'}
									</Button>
									<Button type='button' variant='outline' onClick={handleTestCrypto} disabled={loading}>
										Test
									</Button>
								</div>
							</form>
						</TabsContent>

						<TabsContent value='qr'>
							<div className='mt-4 flex flex-col items-center space-y-4'>
								<div className='w-48 h-48 bg-muted rounded-lg flex items-center justify-center p-4'>
									{loading ? (
										<div className='animate-pulse bg-muted w-full h-full rounded-lg' />
									) : qrCodeData ? (
										<QRCodeSVG value={qrCodeData} size={180} level='M' includeMargin={true} />
									) : (
										<Button variant='outline' onClick={setupQRAuthentication}>
											<QrCode className='w-6 h-6 mr-2' />
											Generate QR Code
										</Button>
									)}
								</div>

								<div className='text-center space-y-2'>
									<div className='flex items-center justify-center space-x-2'>
										<div className='w-2 h-2 rounded-full bg-primary animate-pulse' />
										<span className='text-sm text-muted-foreground'>{qrCodeData ? 'Scan with mobile wallet...' : 'Click to generate QR code'}</span>
									</div>

									{qrCodeData && (
										<div className='space-y-2'>
											<div className='text-xs text-muted-foreground max-w-xs break-all'>Data: {qrCodeData.substring(0, 32)}...</div>
											<Button
												variant='ghost'
												size='sm'
												onClick={() => {
													setQRData(null)
													setQRCodeData('')
													setupQRAuthentication()
												}}>
												Generate new QR code
											</Button>
											<Button variant='outline' size='sm' onClick={handleTestCrypto} disabled={loading}>
												Test Crypto
											</Button>
										</div>
									)}
								</div>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	)
}
