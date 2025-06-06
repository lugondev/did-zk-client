'use client'

import {useState} from 'react'
import {wasmAuth} from '@/lib/wasm-auth'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Alert, AlertDescription} from '@/components/ui/alert'

export default function TestMembershipProofPage() {
	const [organizationId, setOrganizationId] = useState('org-123')
	const [balance, setBalance] = useState(1000)
	const [balanceRangeMin, setBalanceRangeMin] = useState(0)
	const [balanceRangeMax, setBalanceRangeMax] = useState(10000)
	const [isLoading, setIsLoading] = useState(false)
	const [result, setResult] = useState<any>(null)
	const [error, setError] = useState<string | null>(null)

	const handleCreateProof = async () => {
		setIsLoading(true)
		setError(null)
		setResult(null)

		try {
			console.log('Starting membership proof creation...')
			const proofResult = await wasmAuth.createMembershipProofClientSide(organizationId, balance, balanceRangeMin, balanceRangeMax)

			console.log('Membership proof created successfully:', proofResult)
			setResult(proofResult)
		} catch (err) {
			console.error('Failed to create membership proof:', err)
			setError(err instanceof Error ? err.message : 'Unknown error occurred')
		} finally {
			setIsLoading(false)
		}
	}

	const handleGetSystemStatus = async () => {
		try {
			const status = await wasmAuth.getSystemStatus()
			console.log('System status:', status)
			setResult({systemStatus: status})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to get system status')
		}
	}

	return (
		<div className='container mx-auto p-4 max-w-4xl'>
			<Card>
				<CardHeader>
					<CardTitle>Test Membership Proof Creation</CardTitle>
					<CardDescription>Test the createMembershipAndBalanceProof WASM function</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid grid-cols-2 gap-4'>
						<div>
							<label className='block text-sm font-medium mb-1'>Organization ID</label>
							<Input value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} placeholder='org-123' />
						</div>
						<div>
							<label className='block text-sm font-medium mb-1'>Balance</label>
							<Input type='number' value={balance} onChange={(e) => setBalance(parseInt(e.target.value) || 0)} placeholder='1000' />
						</div>
						<div>
							<label className='block text-sm font-medium mb-1'>Balance Range Min</label>
							<Input type='number' value={balanceRangeMin} onChange={(e) => setBalanceRangeMin(parseInt(e.target.value) || 0)} placeholder='0' />
						</div>
						<div>
							<label className='block text-sm font-medium mb-1'>Balance Range Max</label>
							<Input type='number' value={balanceRangeMax} onChange={(e) => setBalanceRangeMax(parseInt(e.target.value) || 0)} placeholder='10000' />
						</div>
					</div>

					<div className='flex gap-2'>
						<Button onClick={handleCreateProof} disabled={isLoading} className='flex-1'>
							{isLoading ? 'Creating Proof...' : 'Create Membership Proof'}
						</Button>
						<Button variant='outline' onClick={handleGetSystemStatus}>
							Get System Status
						</Button>
					</div>

					{error && (
						<Alert variant='destructive'>
							<AlertDescription>
								<strong>Error:</strong> {error}
							</AlertDescription>
						</Alert>
					)}

					{result && (
						<div className='mt-4'>
							<h3 className='text-lg font-semibold mb-2'>Result:</h3>
							<pre className='bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96'>{JSON.stringify(result, null, 2)}</pre>
						</div>
					)}

					<div className='mt-4 text-sm text-gray-600'>
						<h4 className='font-semibold'>Instructions:</h4>
						<ul className='list-disc list-inside mt-1 space-y-1'>
							<li>Click "Get System Status" first to check WASM module status</li>
							<li>Adjust the parameters as needed</li>
							<li>Click "Create Membership Proof" to test the function</li>
							<li>Check the browser console for detailed logs</li>
						</ul>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
