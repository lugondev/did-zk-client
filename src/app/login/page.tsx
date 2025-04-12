'use client'

import {useState, useEffect} from 'react'
import {useRouter, useSearchParams} from 'next/navigation'
import Link from 'next/link'
import {login, loginWithDID, LoginData, DIDLoginData} from '@/lib/auth'
import {authenticateDID, generateQRChallenge, pollQRAuthentication} from '@/app/api/did'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {AlertCircle, Key, QrCode, User} from 'lucide-react'

export default function LoginPage() {
	const router = useRouter()
	const searchParams = useSearchParams()

	type LoginMethodType = 'password' | 'did' | 'qr'
	const [loginMethod, setLoginMethod] = useState<LoginMethodType>('password')
	const [formData, setFormData] = useState<LoginData>({
		username: '',
		password: '',
	})
	const [didFormData, setDidFormData] = useState({
		didId: '',
		privateKey: '',
		challenge: 'login-challenge-' + Math.random().toString(36).substring(2, 10),
	})
	const [didAuthData, setDidAuthData] = useState<{
		proof: string
		signature: string
	} | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [didStep, setDidStep] = useState<'input' | 'authenticate' | 'verify'>('input')
	const [qrData, setQRData] = useState<{challenge: string; qrCode: string} | null>(null)

	useEffect(() => {
		const errorMsg = searchParams.get('error')
		if (errorMsg) {
			setError(errorMsg)
		}
	}, [searchParams])

	const setupQRAuthentication = async () => {
		try {
			setLoading(true)
			const {challenge, qrData} = await generateQRChallenge()
			setQRData({
				challenge,
				qrCode: qrData,
			})
			startPolling(challenge)
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
					const didLoginData: DIDLoginData = {
						didId: result.didId,
						challenge: challenge,
						signature: '',
						proof: '',
					}
					await loginWithDID(didLoginData)
					router.push('/dashboard/profile')
				}
			} catch (err) {
				clearInterval(pollInterval)
				setError('QR authentication failed')
			}
		}, 2000)

		return () => clearInterval(pollInterval)
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const {name, value} = e.target
		setFormData((prev) => ({...prev, [name]: value}))
	}

	const handleDidChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const {name, value} = e.target
		setDidFormData((prev) => ({...prev, [name]: value}))
	}

	const clearError = () => {
		setError(null)
		const url = new URL(window.location.href)
		url.searchParams.delete('error')
		window.history.replaceState({}, '', url.toString())
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		setLoading(true)

		try {
			if (loginMethod === 'password') {
				await login(formData)
				router.push('/dashboard/profile')
			} else if (loginMethod === 'did' && didStep === 'verify' && didAuthData) {
				const didLoginData: DIDLoginData = {
					didId: didFormData.didId,
					challenge: didFormData.challenge,
					signature: didAuthData.signature,
					proof: didAuthData.proof,
				}
				await loginWithDID(didLoginData)
				router.push('/dashboard/profile')
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Login failed')
		} finally {
			setLoading(false)
		}
	}

	const handleDidAuthenticate = async () => {
		if (!didFormData.didId || !didFormData.privateKey || !didFormData.challenge) {
			setError('All DID fields are required')
			return
		}

		setError(null)
		setLoading(true)

		try {
			const authResult = await authenticateDID(didFormData.didId, didFormData.privateKey, didFormData.challenge)

			setDidAuthData({
				proof: authResult.proof,
				signature: authResult.signature,
			})

			setDidStep('verify')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'DID authentication failed')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		if (loginMethod !== 'qr') {
			setQRData(null)
		}
	}, [loginMethod])

	return (
		<div className='min-h-screen flex items-center justify-center bg-background p-4'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<CardTitle>Welcome back</CardTitle>
					<CardDescription>
						Don't have an account?{' '}
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

					<Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as LoginMethodType)}>
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
							<form onSubmit={handleSubmit} className='space-y-4 mt-4'>
								<div className='space-y-2'>
									<Label htmlFor='username'>Username</Label>
									<Input id='username' name='username' type='text' required value={formData.username} onChange={handleChange} />
								</div>
								<div className='space-y-2'>
									<Label htmlFor='password'>Password</Label>
									<Input id='password' name='password' type='password' required value={formData.password} onChange={handleChange} />
								</div>
								<Button type='submit' className='w-full' disabled={loading}>
									{loading ? 'Signing in...' : 'Sign in'}
								</Button>
							</form>
						</TabsContent>

						<TabsContent value='did'>
							<div className='space-y-4 mt-4'>
								{didStep === 'input' && (
									<div className='space-y-4'>
										<div className='space-y-2'>
											<Label htmlFor='didId'>DID Identifier</Label>
											<Input id='didId' name='didId' value={didFormData.didId} onChange={handleDidChange} placeholder='did:example:123...' />
										</div>
										<div className='space-y-2'>
											<Label htmlFor='privateKey'>Private Key</Label>
											<Input id='privateKey' name='privateKey' value={didFormData.privateKey} onChange={handleDidChange} type='password' />
										</div>
										<div className='space-y-2'>
											<Label htmlFor='challenge'>Challenge</Label>
											<Input id='challenge' name='challenge' value={didFormData.challenge} onChange={handleDidChange} readOnly />
										</div>
										<Button onClick={handleDidAuthenticate} disabled={loading} className='w-full'>
											{loading ? 'Authenticating...' : 'Authenticate with DID'}
										</Button>
									</div>
								)}

								{didStep === 'verify' && didAuthData && (
									<div className='space-y-4'>
										<Alert variant='success'>
											<AlertDescription>Your DID has been authenticated. You can now sign in.</AlertDescription>
										</Alert>

										<div className='space-y-2'>
											<Label>Proof</Label>
											<div className='p-2 bg-muted rounded-md'>
												<code className='text-xs break-all'>{didAuthData.proof}</code>
											</div>
										</div>

										<div className='space-y-2'>
											<Label>Signature</Label>
											<div className='p-2 bg-muted rounded-md'>
												<code className='text-xs break-all'>{didAuthData.signature}</code>
											</div>
										</div>

										<div className='space-y-2'>
											<Button onClick={handleSubmit} disabled={loading} className='w-full'>
												{loading ? 'Signing in...' : 'Sign in with DID'}
											</Button>
											<Button
												variant='outline'
												onClick={() => {
													setDidStep('input')
													setDidAuthData(null)
												}}
												className='w-full'>
												Start Over
											</Button>
										</div>
									</div>
								)}
							</div>
						</TabsContent>

						<TabsContent value='qr'>
							<div className='mt-4 flex flex-col items-center space-y-4'>
								<div className='w-48 h-48 bg-muted rounded-lg flex items-center justify-center'>
									{loading ? (
										<div className='animate-pulse bg-muted w-full h-full rounded-lg' />
									) : qrData ? (
										<img src={qrData.qrCode} alt='DID QR Code' className='w-full h-full' />
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
										<span className='text-sm text-muted-foreground'>{qrData ? 'Waiting for mobile wallet...' : 'Click to generate QR code'}</span>
									</div>

									{qrData && (
										<Button
											variant='ghost'
											size='sm'
											onClick={() => {
												setQRData(null)
												setupQRAuthentication()
											}}>
											Generate new QR code
										</Button>
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
