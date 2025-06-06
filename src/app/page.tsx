import Link from 'next/link'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {Shield, Key, User, Cpu, ArrowRight, CheckCircle} from 'lucide-react'

export default function HomePage() {
	return (
		<div className='min-h-screen bg-background'>
			{/* Hero Section */}
			<div className='container mx-auto px-4 py-16'>
				<div className='text-center space-y-6'>
					<div className='flex items-center justify-center space-x-2'>
						<Shield className='w-8 h-8 text-primary' />
						<h1 className='text-4xl font-bold'>Zero-Knowledge DID System</h1>
					</div>
					<p className='text-xl text-muted-foreground max-w-2xl mx-auto'>Decentralized Identity with client-side cryptographic operations using WebAssembly modules</p>
					<div className='flex items-center justify-center space-x-2'>
						<Badge variant='default' className='flex items-center space-x-1'>
							<Cpu className='w-3 h-3' />
							<span>WASM Powered</span>
						</Badge>
						<Badge variant='secondary' className='flex items-center space-x-1'>
							<Shield className='w-3 h-3' />
							<span>Client-Side Crypto</span>
						</Badge>
						<Badge variant='outline' className='flex items-center space-x-1'>
							<Key className='w-3 h-3' />
							<span>Zero-Knowledge Proofs</span>
						</Badge>
					</div>
				</div>
			</div>

			{/* Migration Status */}
			<div className='container mx-auto px-4 pb-16'>
				<Card className='mb-8 border-green-200 bg-green-50/50'>
					<CardHeader>
						<CardTitle className='flex items-center space-x-2 text-green-800'>
							<CheckCircle className='w-5 h-5' />
							<span>Cryptographic Operations Migration Complete</span>
						</CardTitle>
						<CardDescription className='text-green-700'>All major cryptographic operations have been successfully moved from backend to client-side WASM modules</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
							<div className='flex items-center space-x-2'>
								<CheckCircle className='w-4 h-4 text-green-600' />
								<span>Password Hashing</span>
							</div>
							<div className='flex items-center space-x-2'>
								<CheckCircle className='w-4 h-4 text-green-600' />
								<span>DID Creation</span>
							</div>
							<div className='flex items-center space-x-2'>
								<CheckCircle className='w-4 h-4 text-green-600' />
								<span>Digital Signatures</span>
							</div>
							<div className='flex items-center space-x-2'>
								<CheckCircle className='w-4 h-4 text-green-600' />
								<span>ZK Proofs</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Feature Cards */}
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
					{/* Enhanced Authentication */}
					<Card className='hover:shadow-lg transition-shadow'>
						<CardHeader>
							<CardTitle className='flex items-center space-x-2'>
								<User className='w-5 h-5' />
								<span>Enhanced Authentication</span>
							</CardTitle>
							<CardDescription>Client-side password hashing and cryptographic authentication with WASM modules</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='space-y-2 text-sm'>
								<div className='flex items-center space-x-2'>
									<CheckCircle className='w-4 h-4 text-green-600' />
									<span>Client-side password hashing</span>
								</div>
								<div className='flex items-center space-x-2'>
									<CheckCircle className='w-4 h-4 text-green-600' />
									<span>Real-time crypto status</span>
								</div>
								<div className='flex items-center space-x-2'>
									<CheckCircle className='w-4 h-4 text-green-600' />
									<span>No plain text transmission</span>
								</div>
							</div>
							<div className='flex space-x-2'>
								<Link href='/enhanced-login' className='flex-1'>
									<Button className='w-full'>
										Try Enhanced Login
										<ArrowRight className='w-4 h-4 ml-2' />
									</Button>
								</Link>
								<Link href='/login'>
									<Button variant='outline' size='sm'>
										Original
									</Button>
								</Link>
							</div>
						</CardContent>
					</Card>

					{/* Enhanced DID Operations */}
					<Card className='hover:shadow-lg transition-shadow'>
						<CardHeader>
							<CardTitle className='flex items-center space-x-2'>
								<Key className='w-5 h-5' />
								<span>Enhanced DID Operations</span>
							</CardTitle>
							<CardDescription>Complete DID lifecycle with client-side cryptographic operations and zero-knowledge proofs</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='space-y-2 text-sm'>
								<div className='flex items-center space-x-2'>
									<CheckCircle className='w-4 h-4 text-green-600' />
									<span>Client-side DID creation</span>
								</div>
								<div className='flex items-center space-x-2'>
									<CheckCircle className='w-4 h-4 text-green-600' />
									<span>Membership proofs</span>
								</div>
								<div className='flex items-center space-x-2'>
									<CheckCircle className='w-4 h-4 text-green-600' />
									<span>Immediate verification</span>
								</div>
							</div>
							<div className='flex space-x-2'>
								<Link href='/enhanced-did' className='flex-1'>
									<Button className='w-full'>
										Create DID
										<ArrowRight className='w-4 h-4 ml-2' />
									</Button>
								</Link>
								<Link href='/dashboard/did'>
									<Button variant='outline' size='sm'>
										Original
									</Button>
								</Link>
							</div>
						</CardContent>
					</Card>

					{/* Migration Demo */}
					<Card className='hover:shadow-lg transition-shadow'>
						<CardHeader>
							<CardTitle className='flex items-center space-x-2'>
								<Cpu className='w-5 h-5' />
								<span>Migration Demo</span>
							</CardTitle>
							<CardDescription>Performance comparison between backend and client-side cryptographic operations</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='space-y-2 text-sm'>
								<div className='flex items-center space-x-2'>
									<CheckCircle className='w-4 h-4 text-green-600' />
									<span>Performance comparison</span>
								</div>
								<div className='flex items-center space-x-2'>
									<CheckCircle className='w-4 h-4 text-green-600' />
									<span>Security analysis</span>
								</div>
								<div className='flex items-center space-x-2'>
									<CheckCircle className='w-4 h-4 text-green-600' />
									<span>Operation timing</span>
								</div>
							</div>
							<Link href='/crypto-migration-demo'>
								<Button className='w-full'>
									View Demo
									<ArrowRight className='w-4 h-4 ml-2' />
								</Button>
							</Link>
						</CardContent>
					</Card>
				</div>

				{/* Additional Features */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-6'>
					{/* WASM Demos */}
					<Card>
						<CardHeader>
							<CardTitle>WASM Demos</CardTitle>
							<CardDescription>Test and explore WebAssembly cryptographic modules</CardDescription>
						</CardHeader>
						<CardContent className='space-y-2'>
							<Link href='/wasm-demo'>
								<Button variant='outline' className='w-full justify-start'>
									<Cpu className='w-4 h-4 mr-2' />
									WASM Integration Demo
								</Button>
							</Link>
							<Link href='/test-wasm'>
								<Button variant='outline' className='w-full justify-start'>
									<Shield className='w-4 h-4 mr-2' />
									Crypto Function Tests
								</Button>
							</Link>
							<Link href='/binary-demo'>
								<Button variant='outline' className='w-full justify-start'>
									<Key className='w-4 h-4 mr-2' />
									Binary Encoding Demo
								</Button>
							</Link>
						</CardContent>
					</Card>

					{/* Original Features */}
					<Card>
						<CardHeader>
							<CardTitle>Original Features</CardTitle>
							<CardDescription>Access the original implementation for comparison</CardDescription>
						</CardHeader>
						<CardContent className='space-y-2'>
							<Link href='/register'>
								<Button variant='outline' className='w-full justify-start'>
									<User className='w-4 h-4 mr-2' />
									Register Account
								</Button>
							</Link>
							<Link href='/login'>
								<Button variant='outline' className='w-full justify-start'>
									<Key className='w-4 h-4 mr-2' />
									Original Login
								</Button>
							</Link>
							<Link href='/dashboard'>
								<Button variant='outline' className='w-full justify-start'>
									<Shield className='w-4 h-4 mr-2' />
									Dashboard
								</Button>
							</Link>
						</CardContent>
					</Card>
				</div>

				{/* Documentation */}
				<Card className='mt-6'>
					<CardHeader>
						<CardTitle>Implementation Details</CardTitle>
						<CardDescription>Comprehensive documentation of the cryptographic migration</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='text-sm space-y-2'>
							<p>This implementation demonstrates the complete migration of cryptographic operations from backend services to client-side WebAssembly modules, including:</p>
							<ul className='list-disc list-inside space-y-1 ml-4 text-muted-foreground'>
								<li>Client-side password hashing with secure salt generation</li>
								<li>Complete DID creation and authentication workflows</li>
								<li>Zero-knowledge proof generation for membership and balance verification</li>
								<li>Real-time cryptographic operation status indicators</li>
								<li>Performance comparison tools and security analysis</li>
							</ul>
							<p className='text-muted-foreground'>
								See the documentation in <code className='bg-muted px-1 rounded'>docs/crypto-migration-implementation.md</code>
								for detailed technical information and migration benefits.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
