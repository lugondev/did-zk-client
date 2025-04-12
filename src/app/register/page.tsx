'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {register, LoginData} from '@/lib/auth'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form'
import {AlertCircle, Lock} from 'lucide-react'
import {useForm} from 'react-hook-form'
import {z} from 'zod'
import {zodResolver} from '@hookform/resolvers/zod'

const formSchema = z.object({
	username: z.string().min(3, 'Username must be at least 3 characters'),
	password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function RegisterPage() {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			username: '',
			password: '',
		},
	})

	const onSubmit = async (data: z.infer<typeof formSchema>) => {
		setError(null)
		setLoading(true)

		try {
			await register(data)
			router.push('/dashboard/profile')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Registration failed')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-background p-4'>
			<Card className='w-full max-w-md'>
				<CardHeader className='space-y-1'>
					<CardTitle className='text-2xl font-bold text-center'>Create an account</CardTitle>
					<CardDescription className='text-center'>
						Already have an account?{' '}
						<Link href='/login' className='text-primary hover:underline'>
							Sign in
						</Link>
					</CardDescription>
				</CardHeader>
				<CardContent>
					{error && (
						<Alert variant='destructive' className='mb-6'>
							<AlertCircle className='h-4 w-4' />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
							<FormField
								control={form.control}
								name='username'
								render={({field}) => (
									<FormItem>
										<FormLabel>Username</FormLabel>
										<FormControl>
											<Input placeholder='Enter your username' {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name='password'
								render={({field}) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<Input type='password' placeholder='Create a password' {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button type='submit' className='w-full' disabled={loading}>
								<Lock className='mr-2 h-4 w-4' />
								{loading ? 'Creating account...' : 'Create account'}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	)
}
