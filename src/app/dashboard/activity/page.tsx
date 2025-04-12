'use client'

import {useState, useEffect} from 'react'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Separator} from '@/components/ui/separator'
import {Badge} from '@/components/ui/badge'
import {AlertCircle} from 'lucide-react'

// Mock data structure for activities
type Activity = {
	id: string
	type: 'did_update' | 'profile_update' | 'login' | 'register'
	description: string
	timestamp: string
}

// Mock activities (in real implementation, this would come from an API)
const mockActivities: Activity[] = [
	{
		id: '1',
		type: 'did_update',
		description: 'Updated DID configuration',
		timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
	},
	{
		id: '2',
		type: 'profile_update',
		description: 'Updated profile information',
		timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
	},
	{
		id: '3',
		type: 'login',
		description: 'Logged in from new device',
		timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
	},
]

export default function ActivityPage() {
	const [activities, setActivities] = useState<Activity[]>([])
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		// Simulate API call
		const fetchActivities = async () => {
			try {
				// In real implementation, this would be an API call
				await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate loading
				setActivities(mockActivities)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load activities')
			} finally {
				setLoading(false)
			}
		}

		fetchActivities()
	}, [])

	if (loading) {
		return (
			<div className='min-h-screen bg-background flex items-center justify-center'>
				<div className='text-center'>
					<h2 className='text-lg font-semibold text-primary'>Loading...</h2>
				</div>
			</div>
		)
	}

	const getBadgeVariant = (type: Activity['type']) => {
		switch (type) {
			case 'did_update':
				return 'default'
			case 'profile_update':
				return 'secondary'
			case 'login':
				return 'outline'
			case 'register':
				return 'destructive'
			default:
				return 'default'
		}
	}

	return (
		<div className='min-h-screen bg-background p-8'>
			<div className='max-w-3xl mx-auto'>
				<div className='mb-8'>
					<h1 className='text-3xl font-bold'>Activity</h1>
					<p className='text-muted-foreground mt-2'>View your recent account activities and changes</p>
				</div>

				{error && (
					<Alert variant='destructive' className='mb-6'>
						<AlertCircle className='h-4 w-4' />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Recent Activity</CardTitle>
						<CardDescription>Your account activity from the last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='space-y-6'>
							{activities.length === 0 ? (
								<p className='text-center text-muted-foreground py-4'>No recent activity</p>
							) : (
								activities.map((activity, index) => (
									<div key={activity.id}>
										<div className='flex justify-between items-start'>
											<div className='space-y-1'>
												<div className='flex items-center gap-2'>
													<Badge variant={getBadgeVariant(activity.type)}>{activity.type.replace('_', ' ').toUpperCase()}</Badge>
													<span className='text-sm text-muted-foreground'>{new Date(activity.timestamp).toLocaleString()}</span>
												</div>
												<p className='text-sm'>{activity.description}</p>
											</div>
										</div>
										{index < activities.length - 1 && <Separator className='my-4' />}
									</div>
								))
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
