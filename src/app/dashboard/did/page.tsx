'use client'

import {useState, useEffect} from 'react'
import {User, getDIDSettings, updateDIDSettings} from '@/lib/auth'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form'
import {Switch} from '@/components/ui/switch'
import {AlertCircle, CheckCircle2, Key} from 'lucide-react'
import {useForm} from 'react-hook-form'
import {z} from 'zod'
import {zodResolver} from '@hookform/resolvers/zod'

const formSchema = z.object({
	didId: z.string().min(1, 'DID is required'),
	enabled: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

export default function DIDPage() {
	const [user, setUser] = useState<User | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			didId: '',
			enabled: false,
		},
	})

	useEffect(() => {
		const settings = getDIDSettings()
		if (settings) {
			form.reset({
				didId: settings.id,
				enabled: settings.enabled,
			})
		}
	}, [form])

	const onSubmit = async (data: FormData) => {
		setLoading(true)
		setError(null)
		setSuccess(null)

		try {
			await updateDIDSettings(data)
			setSuccess('DID settings updated successfully')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update DID settings')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='min-h-screen bg-background p-8'>
			<div className='max-w-3xl mx-auto'>
				<div className='mb-8'>
					<h1 className='text-3xl font-bold'>DID Settings</h1>
					<p className='text-muted-foreground mt-2'>Manage your Decentralized Identity settings</p>
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
						<CardTitle>DID Configuration</CardTitle>
						<CardDescription>Configure your Decentralized Identity settings</CardDescription>
					</CardHeader>
					<CardContent>
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
								<FormField
									control={form.control}
									name='didId'
									render={({field}) => (
										<FormItem>
											<FormLabel>DID Identifier</FormLabel>
											<FormControl>
												<Input placeholder='did:example:123...' {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name='enabled'
									render={({field}) => (
										<FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
											<div className='space-y-0.5'>
												<FormLabel className='text-base'>Enable DID</FormLabel>
												<FormDescription>Use your DID for authentication and verification</FormDescription>
											</div>
											<FormControl>
												<Switch checked={field.value} onCheckedChange={field.onChange} />
											</FormControl>
										</FormItem>
									)}
								/>

								<Button type='submit' className='w-full' disabled={loading}>
									{loading ? (
										'Saving...'
									) : (
										<>
											<Key className='w-4 h-4 mr-2' />
											Save DID Settings
										</>
									)}
								</Button>
							</form>
						</Form>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
