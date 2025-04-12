'use client'

import {useEffect} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {isAuthenticated} from '@/lib/auth'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Key, Lock, Shield} from 'lucide-react'

export default function Home() {
	const router = useRouter()

	useEffect(() => {
		if (isAuthenticated()) {
			router.push('/dashboard')
		}
	}, [router])

	return (
		<main className='min-h-screen bg-background py-10'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
				<div className='text-center mb-10 space-y-4'>
					<h1 className='text-4xl font-bold text-foreground'>Decentralized Identity (DID) System</h1>
					<p className='text-lg text-muted-foreground'>Create and verify your decentralized identity using zero-knowledge proofs</p>

					<div className='flex justify-center space-x-4'>
						<Button asChild>
							<Link href='/login'>Sign In</Link>
						</Button>
						<Button variant='outline' asChild>
							<Link href='/register'>Create Account</Link>
						</Button>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>About Decentralized Identity</CardTitle>
						<CardDescription>Learn how our DID system works</CardDescription>
					</CardHeader>
					<CardContent className='space-y-6'>
						<div className='flex items-start space-x-4'>
							<Key className='h-6 w-6 text-primary mt-1' />
							<div>
								<h3 className='font-medium'>What is a DID?</h3>
								<p className='text-sm text-muted-foreground'>A Decentralized Identifier (DID) is a new type of identifier that enables verifiable, self-sovereign digital identity.</p>
							</div>
						</div>

						<div className='flex items-start space-x-4'>
							<Lock className='h-6 w-6 text-primary mt-1' />
							<div>
								<h3 className='font-medium'>Zero-Knowledge Proofs</h3>
								<p className='text-sm text-muted-foreground'>Our system uses zero-knowledge proofs to allow you to prove attributes about yourself without revealing the actual data.</p>
							</div>
						</div>

						<div className='flex items-start space-x-4'>
							<Shield className='h-6 w-6 text-primary mt-1' />
							<div>
								<h3 className='font-medium'>Security</h3>
								<p className='text-sm text-muted-foreground'>Your identity is secured using cryptographic techniques, ensuring only you can control and manage your identity.</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	)
}
