'use client'

import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {logout} from '@/lib/auth'
import {Button} from '@/components/ui/button'
import {LogOut} from 'lucide-react'

export default function DashboardLayout({children}: {children: React.ReactNode}) {
	const router = useRouter()

	const handleLogout = () => {
		logout()
		router.push('/login')
	}

	return (
		<div>
			{/* Header */}
			<header className='border-b'>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
					<div className='h-16 flex items-center justify-between'>
						<nav className='flex space-x-4'>
							<Link href='/dashboard' className='text-sm font-medium text-muted-foreground hover:text-foreground'>
								Overview
							</Link>
							<Link href='/dashboard/did' className='text-sm font-medium text-muted-foreground hover:text-foreground'>
								DID Settings
							</Link>
							<Link href='/dashboard/profile' className='text-sm font-medium text-muted-foreground hover:text-foreground'>
								Profile
							</Link>
							<Link href='/dashboard/activity' className='text-sm font-medium text-muted-foreground hover:text-foreground'>
								Activity
							</Link>
						</nav>
						<Button variant='ghost' size='sm' onClick={handleLogout}>
							<LogOut className='h-4 w-4 mr-2' />
							Logout
						</Button>
					</div>
				</div>
			</header>

			{/* Main content */}
			<main>{children}</main>
		</div>
	)
}
