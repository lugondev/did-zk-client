'use client'

import {useState} from 'react'
import {wasmAuth} from '@/lib/wasm-auth'
import {authenticateDID, createDID, verifyDID} from '@/app/api/did'
import {login, loginWithDID} from '@/lib/auth'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {Badge} from '@/components/ui/badge'
import {Separator} from '@/components/ui/separator'
import {AlertCircle, CheckCircle, ArrowRight, Server, Monitor, Clock, Shield} from 'lucide-react'

interface ComparisonResult {
	method: 'backend' | 'wasm'
	operation: string
	duration: number
	success: boolean
	result?: any
	error?: string
}

export default function CryptoMigrationDemo() {
	const [activeDemo, setActiveDemo] = useState<'auth' | 'did' | 'proof'>('auth')
	const [loading, setLoading] = useState(false)
	const [results, setResults] = useState<ComparisonResult[]>([])
	const [testData, setTestData] = useState({
		username: 'demo-user',
		password: 'demo-password',
		didId: '',
		privateKey: '',
		organizationId: 'demo-org-123',
		balance: '1500',
		minBalance: '1000',
		maxBalance: '2000',
	})

	const addResult = (result: ComparisonResult) => {
		setResults((prev) => [...prev, result])
	}

	const clearResults = () => {
		setResults([])
	}

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const {name, value} = e.target
		setTestData((prev) => ({...prev, [name]: value}))
	}

	// Authentication Comparison Demo
	const runAuthenticationComparison = async () => {
		setLoading(true)
		clearResults()

		try {
			// Backend Authentication (Traditional)
			const backendStart = performance.now()
			try {
				// Simulate traditional backend auth (would normally hash on server)
				const mockBackendAuth = async () => {
					await new Promise((resolve) => setTimeout(resolve, 200)) // Network delay simulation
					return {token: 'mock-backend-token', user: {id: 1, username: testData.username}}
				}
				const backendResult = await mockBackendAuth()
				const backendDuration = performance.now() - backendStart

				addResult({
					method: 'backend',
					operation: 'Password Authentication',
					duration: backendDuration,
					success: true,
					result: backendResult,
				})
			} catch (err) {
				addResult({
					method: 'backend',
					operation: 'Password Authentication',
					duration: performance.now() - backendStart,
					success: false,
					error: err instanceof Error ? err.message : 'Backend auth failed',
				})
			}

			// Client-side WASM Authentication
			const wasmStart = performance.now()
			try {
				// Generate keypair client-side
				const keyPair = await wasmAuth.generateAuthKeyPair()

				// Hash password client-side
				const hashResult = await wasmAuth.hashPassword(testData.password)

				// Sign authentication challenge
				const challenge = 'auth-challenge-' + Date.now()
				const signature = await wasmAuth.signDataClientSide(keyPair.privateKey, challenge)

				const wasmDuration = performance.now() - wasmStart

				addResult({
					method: 'wasm',
					operation: 'Password Authentication',
					duration: wasmDuration,
					success: true,
					result: {
						publicKey: keyPair.publicKey,
						passwordHash: hashResult.hash,
						signature,
						challenge,
					},
				})
			} catch (err) {
				addResult({
					method: 'wasm',
					operation: 'Password Authentication',
					duration: performance.now() - wasmStart,
					success: false,
					error: err instanceof Error ? err.message : 'WASM auth failed',
				})
			}
		} finally {
			setLoading(false)
		}
	}

	// DID Operations Comparison Demo
	const runDIDComparison = async () => {
		setLoading(true)
		clearResults()

		try {
			// Backend DID Creation (via API)
			const backendStart = performance.now()
			try {
				const backendResult = await createDID({name: 'Demo User', dob: '1990-01-01'})
				const backendDuration = performance.now() - backendStart

				// Store DID data for authentication test
				setTestData((prev) => ({
					...prev,
					didId: backendResult.did.ID,
					privateKey: backendResult.privateKey,
				}))

				addResult({
					method: 'backend',
					operation: 'DID Creation',
					duration: backendDuration,
					success: true,
					result: backendResult,
				})

				// Backend DID Authentication
				if (backendResult.did.ID && backendResult.privateKey) {
					const authStart = performance.now()
					try {
						const challenge = 'did-challenge-' + Date.now()
						const authResult = await authenticateDID(backendResult.did.ID, backendResult.privateKey, challenge)
						const authDuration = performance.now() - authStart

						addResult({
							method: 'backend',
							operation: 'DID Authentication',
							duration: authDuration,
							success: true,
							result: authResult,
						})
					} catch (err) {
						addResult({
							method: 'backend',
							operation: 'DID Authentication',
							duration: performance.now() - authStart,
							success: false,
							error: err instanceof Error ? err.message : 'Backend DID auth failed',
						})
					}
				}
			} catch (err) {
				addResult({
					method: 'backend',
					operation: 'DID Creation',
					duration: performance.now() - backendStart,
					success: false,
					error: err instanceof Error ? err.message : 'Backend DID creation failed',
				})
			}

			// Client-side WASM DID Operations
			const wasmStart = performance.now()
			try {
				const wasmResult = await wasmAuth.createDIDClientSide('Demo User', '1990-01-01')
				const wasmDuration = performance.now() - wasmStart

				addResult({
					method: 'wasm',
					operation: 'DID Creation',
					duration: wasmDuration,
					success: true,
					result: wasmResult,
				})

				// Client-side DID Authentication
				const authStart = performance.now()
				try {
					const challenge = 'did-challenge-' + Date.now()
					const authResult = await wasmAuth.authenticateDIDClientSide(wasmResult.did.id, wasmResult.privateKey, challenge)
					const authDuration = performance.now() - authStart

					addResult({
						method: 'wasm',
						operation: 'DID Authentication',
						duration: authDuration,
						success: true,
						result: authResult,
					})
				} catch (err) {
					addResult({
						method: 'wasm',
						operation: 'DID Authentication',
						duration: performance.now() - authStart,
						success: false,
						error: err instanceof Error ? err.message : 'WASM DID auth failed',
					})
				}
			} catch (err) {
				addResult({
					method: 'wasm',
					operation: 'DID Creation',
					duration: performance.now() - wasmStart,
					success: false,
					error: err instanceof Error ? err.message : 'WASM DID creation failed',
				})
			}
		} finally {
			setLoading(false)
		}
	}

	// Zero-Knowledge Proof Comparison Demo
	const runProofComparison = async () => {
		setLoading(true)
		clearResults()

		try {
			// Note: For backend ZK proof, we would typically call an API
			// Since we don't have the backend endpoint, we'll simulate it
			const backendStart = performance.now()
			try {
				// Simulate backend proof generation (includes network overhead)
				await new Promise((resolve) => setTimeout(resolve, 500)) // Network + computation delay
				const backendDuration = performance.now() - backendStart

				addResult({
					method: 'backend',
					operation: 'ZK Membership Proof',
					duration: backendDuration,
					success: true,
					result: {
						proof: 'simulated-backend-proof-' + Math.random().toString(36).substring(2),
						note: 'Simulated backend proof (requires API endpoint)',
					},
				})
			} catch (err) {
				addResult({
					method: 'backend',
					operation: 'ZK Membership Proof',
					duration: performance.now() - backendStart,
					success: false,
					error: 'Backend proof generation not available',
				})
			}

			// Client-side WASM Proof Generation
			const wasmStart = performance.now()
			try {
				const wasmResult = await wasmAuth.createMembershipProofClientSide(testData.organizationId, parseInt(testData.balance), parseInt(testData.minBalance), parseInt(testData.maxBalance))
				const wasmDuration = performance.now() - wasmStart

				addResult({
					method: 'wasm',
					operation: 'ZK Membership Proof',
					duration: wasmDuration,
					success: true,
					result: wasmResult,
				})
			} catch (err) {
				addResult({
					method: 'wasm',
					operation: 'ZK Membership Proof',
					duration: performance.now() - wasmStart,
					success: false,
					error: err instanceof Error ? err.message : 'WASM proof generation failed',
				})
			}
		} finally {
			setLoading(false)
		}
	}

	const ResultCard = ({result}: {result: ComparisonResult}) => (
		<Card className={`${result.success ? 'border-green-200' : 'border-red-200'}`}>
			<CardHeader className='pb-2'>
				<CardTitle className='flex items-center justify-between text-sm'>
					<div className='flex items-center space-x-2'>
						{result.method === 'backend' ? <Server className='w-4 h-4' /> : <Monitor className='w-4 h-4' />}
						<span className='capitalize'>{result.method}</span>
						<Badge variant={result.success ? 'default' : 'destructive'}>{result.success ? 'Success' : 'Failed'}</Badge>
					</div>
					<div className='flex items-center space-x-1 text-xs text-muted-foreground'>
						<Clock className='w-3 h-3' />
						<span>{result.duration.toFixed(2)}ms</span>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className='pt-0'>
				<p className='text-sm font-medium mb-2'>{result.operation}</p>
				{result.error && (
					<Alert variant='destructive' className='text-xs'>
						<AlertCircle className='w-3 h-3' />
						<AlertDescription>{result.error}</AlertDescription>
					</Alert>
				)}
				{result.result && (
					<div className='text-xs text-muted-foreground'>
						<code className='bg-muted p-1 rounded'>{typeof result.result === 'string' ? result.result.substring(0, 50) + '...' : JSON.stringify(result.result).substring(0, 50) + '...'}</code>
					</div>
				)}
			</CardContent>
		</Card>
	)

	return (
		<div className='max-w-6xl mx-auto p-6 space-y-6'>
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center space-x-2'>
						<Shield className='w-6 h-6' />
						<span>Cryptographic Operations Migration Demo</span>
					</CardTitle>
					<CardDescription>Compare backend vs client-side WASM cryptographic operations for performance and security.</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs value={activeDemo} onValueChange={(v) => setActiveDemo(v as any)}>
						<TabsList className='grid w-full grid-cols-3'>
							<TabsTrigger value='auth'>Authentication</TabsTrigger>
							<TabsTrigger value='did'>DID Operations</TabsTrigger>
							<TabsTrigger value='proof'>ZK Proofs</TabsTrigger>
						</TabsList>

						<TabsContent value='auth' className='space-y-4'>
							<div className='grid grid-cols-2 gap-4'>
								<div className='space-y-2'>
									<Label htmlFor='username'>Username</Label>
									<Input id='username' name='username' value={testData.username} onChange={handleInputChange} />
								</div>
								<div className='space-y-2'>
									<Label htmlFor='password'>Password</Label>
									<Input id='password' name='password' type='password' value={testData.password} onChange={handleInputChange} />
								</div>
							</div>
							<Button onClick={runAuthenticationComparison} disabled={loading} className='w-full'>
								{loading ? 'Running Comparison...' : 'Compare Authentication Methods'}
							</Button>
						</TabsContent>

						<TabsContent value='did' className='space-y-4'>
							<div className='text-sm text-muted-foreground'>This demo creates a new DID and performs authentication using both backend API calls and client-side WASM operations.</div>
							<Button onClick={runDIDComparison} disabled={loading} className='w-full'>
								{loading ? 'Running Comparison...' : 'Compare DID Operations'}
							</Button>
						</TabsContent>

						<TabsContent value='proof' className='space-y-4'>
							<div className='grid grid-cols-2 gap-4'>
								<div className='space-y-2'>
									<Label htmlFor='organizationId'>Organization ID</Label>
									<Input id='organizationId' name='organizationId' value={testData.organizationId} onChange={handleInputChange} />
								</div>
								<div className='space-y-2'>
									<Label htmlFor='balance'>Balance</Label>
									<Input id='balance' name='balance' type='number' value={testData.balance} onChange={handleInputChange} />
								</div>
								<div className='space-y-2'>
									<Label htmlFor='minBalance'>Min Balance</Label>
									<Input id='minBalance' name='minBalance' type='number' value={testData.minBalance} onChange={handleInputChange} />
								</div>
								<div className='space-y-2'>
									<Label htmlFor='maxBalance'>Max Balance</Label>
									<Input id='maxBalance' name='maxBalance' type='number' value={testData.maxBalance} onChange={handleInputChange} />
								</div>
							</div>
							<Button onClick={runProofComparison} disabled={loading} className='w-full'>
								{loading ? 'Running Comparison...' : 'Compare ZK Proof Generation'}
							</Button>
						</TabsContent>
					</Tabs>

					{results.length > 0 && (
						<>
							<Separator className='my-6' />
							<div className='space-y-4'>
								<div className='flex items-center justify-between'>
									<h3 className='text-lg font-semibold'>Comparison Results</h3>
									<Button variant='outline' size='sm' onClick={clearResults}>
										Clear Results
									</Button>
								</div>

								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									{results.map((result, index) => (
										<ResultCard key={index} result={result} />
									))}
								</div>

								{/* Performance Summary */}
								{results.length >= 2 && (
									<Card className='bg-muted/50'>
										<CardHeader>
											<CardTitle className='text-sm'>Performance Summary</CardTitle>
										</CardHeader>
										<CardContent>
											<div className='space-y-2 text-sm'>
												{results
													.reduce((acc: any[], result) => {
														const existing = acc.find((r) => r.operation === result.operation)
														if (existing) {
															existing.results.push(result)
														} else {
															acc.push({
																operation: result.operation,
																results: [result],
															})
														}
														return acc
													}, [])
													.map((group, index) => {
														const backendResult = group.results.find((r: ComparisonResult) => r.method === 'backend')
														const wasmResult = group.results.find((r: ComparisonResult) => r.method === 'wasm')

														if (backendResult && wasmResult && backendResult.success && wasmResult.success) {
															const improvement = ((backendResult.duration - wasmResult.duration) / backendResult.duration) * 100
															return (
																<div key={index} className='flex items-center justify-between'>
																	<span>{group.operation}:</span>
																	<div className='flex items-center space-x-2'>
																		{improvement > 0 ? (
																			<Badge variant='default' className='text-xs'>
																				{improvement.toFixed(1)}% faster with WASM
																			</Badge>
																		) : (
																			<Badge variant='secondary' className='text-xs'>
																				{Math.abs(improvement).toFixed(1)}% slower with WASM
																			</Badge>
																		)}
																	</div>
																</div>
															)
														}
														return null
													})
													.filter(Boolean)}
											</div>
										</CardContent>
									</Card>
								)}
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
