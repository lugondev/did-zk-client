'use client'

import Link from 'next/link'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Home} from 'lucide-react'

export default function NotFound() {
	return (
		<div className='min-h-screen flex items-center justify-center bg-background p-4'>
			<Card className='w-full max-w-md'>
				<CardHeader className='space-y-1'>
					<CardTitle className='text-3xl font-bold text-center'>404</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4 text-center'>
					<p className='text-muted-foreground'>This page could not be found.</p>
					<Button asChild>
						<Link href='/'>
							<Home className='mr-2 h-4 w-4' />
							Back to Home
						</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
