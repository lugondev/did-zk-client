// Worker factory module to handle dynamic Web Worker instantiation
// This helps resolve Next.js static analysis issues with Worker constructors

let workerInstance: Worker | null = null;

/**
 * Creates a worker instance using eval to completely bypass static analysis
 */
function createWorkerWithEval(): Worker {
	// Use eval to construct the worker at runtime
	// This completely hides the Worker constructor from static analysis
	return eval('new Worker("/wasm-worker.js")') as Worker;
}

/**
 * Alternative method using runtime function construction
 */
function createWorkerWithFunction(): Worker {
	// Create a function that returns a worker at runtime
	const createWorker = new Function('return new Worker("/wasm-worker.js")');
	return createWorker() as Worker;
}

/**
 * Create worker using dynamic property access to avoid static analysis
 */
function createWorkerWithDynamicAccess(): Worker {
	// Use dynamic property access to avoid static detection
	const win = globalThis as any;
	const WorkerClass = win['Worker'];
	return new WorkerClass('/wasm-worker.js');
}

/**
 * Dynamically creates a Web Worker instance using runtime evaluation
 * This approach completely bypasses Next.js static analysis
 */
export async function createWASMWorker(): Promise<Worker> {
	// Always create a new worker instance to avoid initialization issues
	// Terminate existing instance if it exists
	if (workerInstance) {
		workerInstance.terminate();
		workerInstance = null;
	}

	try {
		// Try different methods in order of preference
		try {
			// First try the eval approach (most reliable for bypassing static analysis)
			workerInstance = createWorkerWithEval();
		} catch (error) {
			try {
				// Fallback to dynamic property access approach
				workerInstance = createWorkerWithDynamicAccess();
			} catch (error2) {
				// Last resort: function constructor approach
				workerInstance = createWorkerWithFunction();
			}
		}

		if (!workerInstance) {
			throw new Error('Failed to create worker instance');
		}

		return workerInstance;
	} catch (error) {
		throw new Error(`Failed to create WASM worker: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

/**
 * Terminates the current worker instance and clears the reference
 */
export function terminateWASMWorker(): void {
	if (workerInstance) {
		workerInstance.terminate();
		workerInstance = null;
	}
}

/**
 * Returns the current worker instance without creating a new one
 */
export function getWASMWorkerInstance(): Worker | null {
	return workerInstance;
}