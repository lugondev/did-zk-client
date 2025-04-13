import {Suspense} from 'react'
import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
	return (
		<Suspense fallback={<div className='min-h-screen flex items-center justify-center bg-background p-4'>Loading...</div>}>
			<LoginForm />
		</Suspense>
	)
}
