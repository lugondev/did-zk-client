'use client'

import {useState, useEffect} from 'react'
import {User, getUserData, updateProfile} from '@/lib/auth'
import type {UpdateProfileData} from '@/lib/auth'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {Separator} from '@/components/ui/separator'
import {AlertCircle, CheckCircle2} from 'lucide-react'
import {useForm} from 'react-hook-form'

export default function ProfilePage() {
	const [user, setUser] = useState<User | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	const form = useForm<UpdateProfileData>({
		defaultValues: {
			username: '',
			email: '',
		},
	})

	useEffect(() => {
		const userData = getUserData()
		if (userData) {
			setUser(userData)
		}
	}, [])

	const onSubmit = async (data: UpdateProfileData) => {
		setLoading(true)
		setError(null)
		setSuccess(null)

		try {
			const updatedUser = await updateProfile(data)
			setUser(updatedUser)
			setSuccess('Profile updated successfully')
			form.reset() // Clear form
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update profile')
		} finally {
			setLoading(false)
		}
	}

	if (!user) {
		return (
			<div className='min-h-screen bg-background flex items-center justify-center'>
				<div className='text-center'>
					<h2 className='text-lg font-semibold text-primary'>Loading...</h2>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-background p-8'>
			<div className='max-w-3xl mx-auto'>
				<div className='mb-8'>
					<h1 className='text-3xl font-bold'>Profile</h1>
					<p className='text-muted-foreground mt-2'>Manage your account information and settings</p>
				</div>

				{success && (
					<Alert variant='success' className='mb-6'>
						<CheckCircle2 className='h-4 w-4' />
						<AlertDescription>{success}</AlertDescription>
					</Alert>
				)}

				{error && (
					<Alert variant='destructive' className='mb-6'>
						<AlertCircle className='h-4 w-4' />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Personal Information</CardTitle>
						<CardDescription>Update your profile details</CardDescription>
					</CardHeader>
					<CardContent>
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
								<FormField
									control={form.control}
									name='username'
									render={({field}) => (
										<FormItem>
											<FormLabel>Username</FormLabel>
											<FormControl>
												<Input placeholder={user.username} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name='email'
									render={({field}) => (
										<FormItem>
											<FormLabel>Email</FormLabel>
											<FormControl>
												<Input type='email' placeholder={user.email || 'Not set'} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<Separator className='my-6' />

								<div className='space-y-4'>
									<div className='flex justify-between items-center'>
										<div>
											<h4 className='text-sm font-medium'>Created</h4>
											<p className='text-sm text-muted-foreground'>{new Date(user.created_at).toLocaleString()}</p>
										</div>
									</div>

									<div className='flex justify-between items-center'>
										<div>
											<h4 className='text-sm font-medium'>Last Login</h4>
											<p className='text-sm text-muted-foreground'>{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</p>
										</div>
									</div>

									<div className='flex justify-between items-center'>
										<div>
											<h4 className='text-sm font-medium'>Last Updated</h4>
											<p className='text-sm text-muted-foreground'>{user.last_updated_at ? new Date(user.last_updated_at).toLocaleString() : 'Never'}</p>
										</div>
									</div>

									<div className='flex justify-between items-center'>
										<div>
											<h4 className='text-sm font-medium'>DID</h4>
											<p className='text-sm text-muted-foreground'>{user.did || 'Not connected'}</p>
										</div>
									</div>
								</div>

								<div className='flex justify-end'>
									<Button type='submit' disabled={loading}>
										{loading ? 'Saving...' : 'Save Changes'}
									</Button>
								</div>
							</form>
						</Form>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
