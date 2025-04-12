'use client'

import {useEffect, useState} from 'react'
import {User, getDIDSettings} from '@/lib/auth'
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import Link from 'next/link'
import {Clock, KeyRound, User as UserIcon} from 'lucide-react'

export default function DashboardPage() {
	const [user, setUser] = useState<User | null>(null)
	const [didSettings, setDidSettings] = useState<{id: string; enabled: boolean} | null>(null)

	useEffect(() => {
		const userStr = localStorage.getItem('user_data')
		if (userStr) {
			setUser(JSON.parse(userStr))
		}
		const settings = getDIDSettings()
		if (settings) {
			setDidSettings(settings)
		}
	}, [])

	if (!user) {
		return (
			<div className='min-h-screen bg-background flex items-center justify-center'>
				<div className='text-center'>
					<h2 className='text-lg font-semibold text-primary'>Loading...</h2>
				</div>
			</div>
		)
	}

	const lastLoginDate = user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'

	return (
		<div className='min-h-screen bg-background p-8'>
			<div className='max-w-7xl mx-auto'>
				<div className='mb-8'>
					<h1 className='text-3xl font-bold'>Dashboard Overview</h1>
					<p className='text-muted-foreground mt-2'>Quick summary and settings</p>
				</div>

				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
					{/* Profile Card */}
					<Card>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-sm font-medium'>Profile</CardTitle>
							<UserIcon className='h-4 w-4 text-muted-foreground' />
						</CardHeader>
						<CardContent>
							<div className='text-2xl font-bold'>{user.username}</div>
							<p className='text-xs text-muted-foreground'>Active User</p>
						</CardContent>
						<CardFooter>
							<Link href='/dashboard/profile' className='text-sm text-primary hover:underline'>
								View profile details
							</Link>
						</CardFooter>
					</Card>

					{/* DID Status Card */}
					<Card>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-sm font-medium'>DID Status</CardTitle>
							<KeyRound className='h-4 w-4 text-muted-foreground' />
						</CardHeader>
						<CardContent>
							<div className='space-y-2'>
								<Badge variant={didSettings?.enabled ? 'success' : 'secondary'}>{didSettings?.enabled ? 'Enabled' : 'Not Connected'}</Badge>
								{didSettings?.enabled && <p className='text-xs text-muted-foreground mt-2'>DID: {didSettings.id}</p>}
							</div>
						</CardContent>
						<CardFooter>
							<Link href='/dashboard/did' className='text-sm text-primary hover:underline'>
								Manage DID settings
							</Link>
						</CardFooter>
					</Card>

					{/* Last Activity Card */}
					<Card>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-sm font-medium'>Last Activity</CardTitle>
							<Clock className='h-4 w-4 text-muted-foreground' />
						</CardHeader>
						<CardContent>
							<div className='space-y-2'>
								<div className='text-2xl font-bold'>Last Login</div>
								<p className='text-xs text-muted-foreground'>{lastLoginDate}</p>
							</div>
						</CardContent>
						<CardFooter>
							<Link href='/dashboard/activity' className='text-sm text-primary hover:underline'>
								View activity history
							</Link>
						</CardFooter>
					</Card>
				</div>
			</div>
		</div>
	)
}
