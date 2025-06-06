'use client'

import {useState, useEffect} from 'react'
import {wasmAuth} from '@/lib/wasm-auth'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {Badge} from '@/components/ui/badge'
import {AlertCircle, CheckCircle, Key, User, Shield, Cpu, Hash, Zap, RefreshCw} from 'lucide-react'

interface DIDCreationResult {
	did: any
	privateKey: string
	credential: any
	salt: string
}

interface MembershipProofResult {
	proof: string
	salt: string
	commitment: string
	organizationIdHash: string
}

export default function EnhancedDIDForm() {
	const [activeTab, setActiveTab] = useState<'create' | 'membership' | 'test' | 'worker'>('create')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)

	// DID Creation Form
	const [didForm, setDidForm] = useState({
		name: '',
		dob: '',
	})
	const [didResult, setDidResult] = useState<DIDCreationResult | null>(null)

	// Membership Proof Form
	const [membershipForm, setMembershipForm] = useState({
		organizationId: '',
		balance: '',
		balanceRangeMin: '',
		balanceRangeMax: '',
	})
	const [membershipResult, setMembershipResult] = useState<MembershipProofResult | null>(null)

	// Crypto Status
	const [cryptoStatus, setCryptoStatus] = useState<{
		wasmLoaded: boolean
		didCreated: boolean
		credentialIssued: boolean
		proofGenerated: boolean
	}>({
		wasmLoaded: false,
		didCreated: false,
		credentialIssued: false,
		proofGenerated: false,
	})

	// Web Worker Status
	const [workerStatus, setWorkerStatus] = useState<any>(null)
	const [loadingWorkerStatus, setLoadingWorkerStatus] = useState(false)

	const resetStatus = () => {
		setCryptoStatus({
			wasmLoaded: false,
			didCreated: false,
			credentialIssued: false,
			proofGenerated: false,
		})
		setError(null)
		setSuccess(null)
	}

	// Load worker status on component mount
	useEffect(() => {
		loadWorkerStatus()
	}, [])

	const loadWorkerStatus = async () => {
		setLoadingWorkerStatus(true)
		try {
			const status = await wasmAuth.getSystemStatus()
			setWorkerStatus(status)
		} catch (err) {
			console.error('Failed to load worker status:', err)
		} finally {
			setLoadingWorkerStatus(false)
		}
	}

	const handlePreloadWASM = async () => {
		setLoading(true)
		try {
			const result = await wasmAuth.preloadWASMModules()
			setSuccess(`WASM modules preloaded in ${result.loadTime}ms. Crypto: ${result.cryptoLoaded ? '✓' : '✗'}, DID: ${result.didLoaded ? '✓' : '✗'}`)
			await loadWorkerStatus() // Refresh status
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to preload WASM modules')
		} finally {
			setLoading(false)
		}
	}

	const handleReloadWASM = async () => {
		setLoading(true)
		try {
			await wasmAuth.reloadWASMModules()
			setSuccess('WASM modules reloaded successfully')
			await loadWorkerStatus() // Refresh status
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to reload WASM modules')
		} finally {
			setLoading(false)
		}
	}

	const handleDIDFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const {name, value} = e.target
		setDidForm((prev) => ({...prev, [name]: value}))
	}

	const handleMembershipFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const {name, value} = e.target
		setMembershipForm((prev) => ({...prev, [name]: value}))
	}

	const handleCreateDID = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		resetStatus()

		try {
			if (!didForm.name || !didForm.dob) {
				throw new Error('Name and Date of Birth are required')
			}

			// Step 1: Load WASM modules
			setCryptoStatus((prev) => ({...prev, wasmLoaded: true}))

			// Step 2: Create DID with client-side crypto
			setCryptoStatus((prev) => ({...prev, didCreated: true}))

			// Step 3: Issue age credential
			setCryptoStatus((prev) => ({...prev, credentialIssued: true}))

			const result = await wasmAuth.createDIDClientSide(didForm.name, didForm.dob)
			setDidResult(result)

			setSuccess('DID created successfully with client-side cryptographic operations!')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create DID')
		} finally {
			setLoading(false)
		}
	}

	const handleCreateMembershipProof = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		resetStatus()

		try {
			const {organizationId, balance, balanceRangeMin, balanceRangeMax} = membershipForm

			if (!organizationId || !balance || !balanceRangeMin || !balanceRangeMax) {
				throw new Error('All membership fields are required')
			}

			const balanceNum = parseInt(balance)
			const minNum = parseInt(balanceRangeMin)
			const maxNum = parseInt(balanceRangeMax)

			if (balanceNum < minNum || balanceNum > maxNum) {
				throw new Error('Balance must be within the specified range')
			}

			// Step 1: Load WASM modules
			setCryptoStatus((prev) => ({...prev, wasmLoaded: true}))

			// Step 2: Generate proof
			setCryptoStatus((prev) => ({...prev, proofGenerated: true}))

			const result = await wasmAuth.createMembershipProofClientSide(organizationId, balanceNum, minNum, maxNum)

			setMembershipResult(result)
			setSuccess('Membership and balance proof created successfully!')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create membership proof')
		} finally {
			setLoading(false)
		}
	}

	const handleTestCrypto = async () => {
		setLoading(true)
		resetStatus()

		try {
			// Step 1: Test WASM loading
			setCryptoStatus((prev) => ({...prev, wasmLoaded: true}))

			// Step 2: Test key generation
			const keyPair = await wasmAuth.generateAuthKeyPair()
			setCryptoStatus((prev) => ({...prev, didCreated: true}))

			// Step 3: Test signing and verification
			const testData = 'test-message-' + Date.now()
			const signature = await wasmAuth.signDataClientSide(keyPair.privateKey, testData)
			const verified = await wasmAuth.verifySignatureClientSide(keyPair.publicKey, testData, signature)
			setCryptoStatus((prev) => ({...prev, credentialIssued: true}))

			// Step 4: Test hashing
			const hash = await wasmAuth.hashPassword('test-password')
			setCryptoStatus((prev) => ({...prev, proofGenerated: true}))

			if (verified && hash.hash.length > 0) {
				setSuccess('All cryptographic operations working correctly!')
			} else {
				throw new Error('Cryptographic verification failed')
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Crypto test failed')
		} finally {
			setLoading(false)
		}
	}

	const CryptoStatusIndicator = () => (
		<div className='flex items-center space-x-2 text-xs text-muted-foreground mb-4'>
			<Cpu className='w-4 h-4' />
			<span>WASM Operations:</span>
			<div className={`w-3 h-3 rounded-full ${cryptoStatus.wasmLoaded ? 'bg-green-500' : 'bg-gray-300'}`} />
			<span>Load</span>
			<div className={`w-3 h-3 rounded-full ${cryptoStatus.didCreated ? 'bg-green-500' : 'bg-gray-300'}`} />
			<span>Create</span>
			<div className={`w-3 h-3 rounded-full ${cryptoStatus.credentialIssued ? 'bg-green-500' : 'bg-gray-300'}`} />
			<span>Sign</span>
			<div className={`w-3 h-3 rounded-full ${cryptoStatus.proofGenerated ? 'bg-green-500' : 'bg-gray-300'}`} />
			<span>Prove</span>
		</div>
	)

	return (
		<div className='max-w-4xl mx-auto p-6 space-y-6'>
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center space-x-2'>
						<Shield className='w-5 h-5' />
						<span>Enhanced DID Operations</span>
					</CardTitle>
					<CardDescription>Create DIDs and generate zero-knowledge proofs using client-side WASM cryptographic operations.</CardDescription>
				</CardHeader>
				<CardContent>
					<CryptoStatusIndicator />

					{error && (
						<Alert variant='destructive' className='mb-6'>
							<AlertCircle className='h-4 w-4' />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{success && (
						<Alert className='mb-6 border-green-500 text-green-700'>
							<CheckCircle className='h-4 w-4' />
							<AlertDescription>{success}</AlertDescription>
						</Alert>
					)}

					<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
						<TabsList className='grid w-full grid-cols-4'>
							<TabsTrigger value='create'>
								<User className='w-4 h-4 mr-2' />
								Create DID
							</TabsTrigger>
							<TabsTrigger value='membership'>
								<Key className='w-4 h-4 mr-2' />
								Membership Proof
							</TabsTrigger>
							<TabsTrigger value='test'>
								<Cpu className='w-4 h-4 mr-2' />
								Test Crypto
							</TabsTrigger>
							<TabsTrigger value='worker'>
								<Zap className='w-4 h-4 mr-2' />
								Web Worker
							</TabsTrigger>
						</TabsList>

						<TabsContent value='create' className='space-y-4'>
							<form onSubmit={handleCreateDID} className='space-y-4'>
								<div className='space-y-2'>
									<Label htmlFor='name'>Full Name</Label>
									<Input id='name' name='name' value={didForm.name} onChange={handleDIDFormChange} placeholder='Enter your full name' required />
								</div>
								<div className='space-y-2'>
									<Label htmlFor='dob'>Date of Birth</Label>
									<Input id='dob' name='dob' type='date' value={didForm.dob} onChange={handleDIDFormChange} required />
								</div>
								<Button type='submit' disabled={loading} className='w-full'>
									{loading ? 'Creating DID...' : 'Create DID with WASM'}
								</Button>
							</form>

							{didResult && (
								<div className='space-y-4 mt-6'>
									<h3 className='text-lg font-semibold'>DID Created Successfully</h3>
									<div className='grid gap-4'>
										<div className='space-y-2'>
											<Label className='flex items-center space-x-2'>
												<Hash className='w-4 h-4' />
												<span>DID Identifier</span>
											</Label>
											<div className='p-3 bg-muted rounded-md'>
												<code className='text-sm break-all'>{didResult.did.id}</code>
											</div>
										</div>
										<div className='space-y-2'>
											<Label className='flex items-center space-x-2'>
												<Key className='w-4 h-4' />
												<span>Private Key</span>
											</Label>
											<div className='p-3 bg-muted rounded-md'>
												<code className='text-sm break-all'>{didResult.privateKey}</code>
											</div>
										</div>
										<div className='space-y-2'>
											<Label>Age Credential Salt</Label>
											<div className='p-3 bg-muted rounded-md'>
												<code className='text-sm break-all'>{didResult.salt}</code>
											</div>
										</div>
									</div>
								</div>
							)}
						</TabsContent>

						<TabsContent value='membership' className='space-y-4'>
							<form onSubmit={handleCreateMembershipProof} className='space-y-4'>
								<div className='space-y-2'>
									<Label htmlFor='organizationId'>Organization ID</Label>
									<Input id='organizationId' name='organizationId' value={membershipForm.organizationId} onChange={handleMembershipFormChange} placeholder='org-12345' required />
								</div>
								<div className='grid grid-cols-3 gap-4'>
									<div className='space-y-2'>
										<Label htmlFor='balance'>Your Balance</Label>
										<Input id='balance' name='balance' type='number' value={membershipForm.balance} onChange={handleMembershipFormChange} placeholder='1000' required />
									</div>
									<div className='space-y-2'>
										<Label htmlFor='balanceRangeMin'>Range Min</Label>
										<Input id='balanceRangeMin' name='balanceRangeMin' type='number' value={membershipForm.balanceRangeMin} onChange={handleMembershipFormChange} placeholder='500' required />
									</div>
									<div className='space-y-2'>
										<Label htmlFor='balanceRangeMax'>Range Max</Label>
										<Input id='balanceRangeMax' name='balanceRangeMax' type='number' value={membershipForm.balanceRangeMax} onChange={handleMembershipFormChange} placeholder='2000' required />
									</div>
								</div>
								<Button type='submit' disabled={loading} className='w-full'>
									{loading ? 'Generating Proof...' : 'Generate Membership Proof'}
								</Button>
							</form>

							{membershipResult && (
								<div className='space-y-4 mt-6'>
									<h3 className='text-lg font-semibold'>Membership Proof Generated</h3>
									<div className='grid gap-4'>
										<div className='space-y-2'>
											<Label>Zero-Knowledge Proof</Label>
											<div className='p-3 bg-muted rounded-md'>
												<code className='text-sm break-all'>{membershipResult.proof}</code>
											</div>
										</div>
										<div className='space-y-2'>
											<Label>Commitment Hash</Label>
											<div className='p-3 bg-muted rounded-md'>
												<code className='text-sm break-all'>{membershipResult.commitment}</code>
											</div>
										</div>
										<div className='space-y-2'>
											<Label>Organization ID Hash</Label>
											<div className='p-3 bg-muted rounded-md'>
												<code className='text-sm break-all'>{membershipResult.organizationIdHash}</code>
											</div>
										</div>
									</div>
								</div>
							)}
						</TabsContent>

						<TabsContent value='test' className='space-y-4'>
							<div className='text-center space-y-4'>
								<div className='space-y-2'>
									<h3 className='text-lg font-semibold'>Cryptographic Operations Test</h3>
									<p className='text-muted-foreground'>Test all WASM cryptographic functions to ensure they're working correctly.</p>
								</div>

								<div className='grid grid-cols-2 gap-4 text-sm'>
									<Badge variant={cryptoStatus.wasmLoaded ? 'default' : 'secondary'}>WASM Modules {cryptoStatus.wasmLoaded ? '✓' : '○'}</Badge>
									<Badge variant={cryptoStatus.didCreated ? 'default' : 'secondary'}>Key Generation {cryptoStatus.didCreated ? '✓' : '○'}</Badge>
									<Badge variant={cryptoStatus.credentialIssued ? 'default' : 'secondary'}>Sign & Verify {cryptoStatus.credentialIssued ? '✓' : '○'}</Badge>
									<Badge variant={cryptoStatus.proofGenerated ? 'default' : 'secondary'}>Hash Functions {cryptoStatus.proofGenerated ? '✓' : '○'}</Badge>
								</div>

								<Button onClick={handleTestCrypto} disabled={loading} className='w-full'>
									{loading ? 'Testing...' : 'Run Cryptographic Test'}
								</Button>
							</div>
						</TabsContent>

						<TabsContent value='worker' className='space-y-4'>
							<div className='space-y-4'>
								<div className='space-y-2'>
									<h3 className='text-lg font-semibold flex items-center space-x-2'>
										<Zap className='w-5 h-5' />
										<span>Web Worker Status & Performance</span>
									</h3>
									<p className='text-muted-foreground'>Monitor and control WASM loading via Web Workers to prevent browser blocking.</p>
								</div>

								<div className='grid grid-cols-2 gap-4'>
									<Button onClick={handlePreloadWASM} disabled={loading} variant='outline'>
										<Cpu className='w-4 h-4 mr-2' />
										{loading ? 'Preloading...' : 'Preload WASM'}
									</Button>
									<Button onClick={handleReloadWASM} disabled={loading} variant='outline'>
										<RefreshCw className='w-4 h-4 mr-2' />
										{loading ? 'Reloading...' : 'Reload WASM'}
									</Button>
									<Button onClick={loadWorkerStatus} disabled={loadingWorkerStatus} variant='outline' className='col-span-2'>
										<RefreshCw className={`w-4 h-4 mr-2 ${loadingWorkerStatus ? 'animate-spin' : ''}`} />
										{loadingWorkerStatus ? 'Refreshing...' : 'Refresh Status'}
									</Button>
								</div>

								{workerStatus && (
									<div className='space-y-4'>
										<div className='grid gap-4'>
											<div className='space-y-2'>
												<Label className='text-sm font-medium'>System Configuration</Label>
												<div className='grid grid-cols-2 gap-2 text-sm'>
													<Badge variant={workerStatus.webWorkerSupported ? 'default' : 'destructive'}>Web Workers {workerStatus.webWorkerSupported ? 'Supported' : 'Not Supported'}</Badge>
													<Badge variant={workerStatus.usingWebWorker ? 'default' : 'secondary'}>{workerStatus.usingWebWorker ? 'Using Web Worker' : 'Main Thread'}</Badge>
												</div>
											</div>

											{workerStatus.usingWebWorker && workerStatus.workerStatus && (
												<div className='space-y-2'>
													<Label className='text-sm font-medium'>Web Worker Status</Label>
													<div className='grid grid-cols-2 gap-2 text-sm'>
														<Badge variant={workerStatus.workerStatus.cryptoLoaded ? 'default' : 'secondary'}>Crypto Module {workerStatus.workerStatus.cryptoLoaded ? 'Loaded' : 'Not Loaded'}</Badge>
														<Badge variant={workerStatus.workerStatus.didLoaded ? 'default' : 'secondary'}>DID Module {workerStatus.workerStatus.didLoaded ? 'Loaded' : 'Not Loaded'}</Badge>
														<Badge variant={workerStatus.workerStatus.cryptoReady ? 'default' : 'secondary'}>Crypto {workerStatus.workerStatus.cryptoReady ? 'Ready' : 'Not Ready'}</Badge>
														<Badge variant={workerStatus.workerStatus.didReady ? 'default' : 'secondary'}>DID {workerStatus.workerStatus.didReady ? 'Ready' : 'Not Ready'}</Badge>
													</div>
												</div>
											)}

											{workerStatus.workerPing && (
												<div className='space-y-2'>
													<Label className='text-sm font-medium'>Worker Performance</Label>
													<div className='p-3 bg-muted rounded-md'>
														<code className='text-xs'>
															Ping Response: {workerStatus.workerPing.pong ? '✓' : '✗'} | Timestamp: {new Date(workerStatus.workerPing.timestamp).toLocaleTimeString()}
														</code>
													</div>
												</div>
											)}

											{workerStatus.cryptoWasmStatus && (
												<div className='space-y-2'>
													<Label className='text-sm font-medium'>Crypto WASM Status</Label>
													<div className='grid grid-cols-2 gap-2 text-sm'>
														<Badge variant={workerStatus.cryptoWasmStatus.cryptoLoaded ? 'default' : 'secondary'}>Crypto {workerStatus.cryptoWasmStatus.cryptoLoaded ? 'Loaded' : 'Not Loaded'}</Badge>
														<Badge variant={workerStatus.cryptoWasmStatus.didLoaded ? 'default' : 'secondary'}>DID {workerStatus.cryptoWasmStatus.didLoaded ? 'Loaded' : 'Not Loaded'}</Badge>
													</div>
												</div>
											)}

											{workerStatus.workerError && (
												<Alert variant='destructive'>
													<AlertCircle className='h-4 w-4' />
													<AlertDescription>Worker Error: {workerStatus.workerError}</AlertDescription>
												</Alert>
											)}
										</div>
									</div>
								)}

								<div className='space-y-2'>
									<Label className='text-sm font-medium'>Performance Benefits</Label>
									<div className='text-sm text-muted-foreground space-y-1'>
										<p>
											• <strong>Non-blocking:</strong> WASM modules load in background worker threads
										</p>
										<p>
											• <strong>Responsive UI:</strong> Main thread remains free for user interactions
										</p>
										<p>
											• <strong>Parallel Loading:</strong> Multiple WASM modules can load simultaneously
										</p>
										<p>
											• <strong>Error Isolation:</strong> Worker failures don't crash the main application
										</p>
									</div>
								</div>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	)
}
