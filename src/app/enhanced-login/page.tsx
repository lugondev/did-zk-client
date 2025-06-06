'use client'

import {Suspense} from 'react'
import EnhancedLoginForm from '@/components/EnhancedLoginForm'

export default function EnhancedLoginPage() {
	return (
		<div>
			<Suspense fallback={<div>Loading...</div>}>
				<EnhancedLoginForm />
			</Suspense>
		</div>
	)
}
