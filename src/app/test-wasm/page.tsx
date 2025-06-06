'use client'

import {useEffect, useState} from 'react'

declare global {
	interface Window {
		Go: any
		generateKeyPair: () => Promise<string>
		wasmCryptoReady: boolean
	}
}

export default function TestWASM() {
	const [status, setStatus] = useState('Loading...')
	const [result, setResult] = useState('')

	useEffect(() => {
		const loadWASM = async () => {
			try {
				setStatus('Loading wasm_exec.js...')

				// Load wasm_exec.js
				const script = document.createElement('script')
				script.src = '/wasm_exec.js'

				script.onload = async () => {
					setStatus('wasm_exec.js loaded, initializing Go...')

					const go = new window.Go()

					try {
						setStatus('Loading crypto.wasm...')
						const response = await fetch('/crypto.wasm')
						const wasmArrayBuffer = await response.arrayBuffer()
						const wasmModule = await WebAssembly.instantiate(wasmArrayBuffer, go.importObject)

						setStatus('Running WASM module...')
						go.run(wasmModule.instance)

						// Wait for the module to be ready
						const checkReady = () => {
							if (window.wasmCryptoReady) {
								setStatus('WASM module ready! Testing generateKeyPair...')
								testGenerateKeyPair()
							} else {
								setTimeout(checkReady, 100)
							}
						}

						setTimeout(checkReady, 200)
					} catch (wasmError) {
						const errorMessage = wasmError instanceof Error ? wasmError.message : 'Unknown WASM error'
						setStatus(`WASM Error: ${errorMessage}`)
						console.error('WASM Error:', wasmError)
					}
				}

				script.onerror = () => {
					setStatus('Failed to load wasm_exec.js')
				}

				document.head.appendChild(script)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error'
				setStatus(`Error: ${errorMessage}`)
				console.error('Error:', error)
			}
		}

		const testGenerateKeyPair = async () => {
			try {
				setStatus('Calling generateKeyPair...')
				const result = await window.generateKeyPair()
				setResult(result)
				setStatus('Success!')
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error'
				setStatus(`generateKeyPair Error: ${errorMessage}`)
				console.error('generateKeyPair Error:', error)
			}
		}

		loadWASM()
	}, [])

	return (
		<div className='max-w-2xl mx-auto p-6'>
			<h1 className='text-2xl font-bold mb-4'>WASM Test Page</h1>

			<div className='space-y-4'>
				<div>
					<h2 className='text-lg font-semibold'>Status:</h2>
					<p className='text-gray-700'>{status}</p>
				</div>

				{result && (
					<div>
						<h2 className='text-lg font-semibold'>Result:</h2>
						<pre className='bg-gray-100 p-4 rounded overflow-x-auto text-sm'>{result}</pre>
					</div>
				)}
			</div>
		</div>
	)
}
