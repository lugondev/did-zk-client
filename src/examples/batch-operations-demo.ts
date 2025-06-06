// Demonstration of API Operation Batching Implementation
// This file shows examples of how the batch operations work

import {
	// Individual operations
	createDID,
	authenticateDID,
	verifyDID,
	// Batch operations
	batchCreateDIDAndIssueCredential,
	batchAuthenticateAndVerifyDID,
	shouldUseBatching
} from '../app/api/did';

// Example 1: Individual Operations (Traditional Approach)
export async function demonstrateIndividualOperations() {
	console.log('=== Individual Operations Demo ===');

	try {
		// Step 1: Create DID
		console.log('1. Creating DID...');
		const didResponse = await createDID({
			name: 'John Doe',
			dob: '2000-01-01'
		});
		console.log('DID Created:', didResponse.did.ID);

		// Step 2: Authenticate DID
		console.log('2. Authenticating DID...');
		const authResponse = await authenticateDID(
			didResponse.did.ID,
			didResponse.privateKey,
			'demo-challenge-123'
		);
		console.log('Authentication proof generated');

		// Step 3: Verify DID
		console.log('3. Verifying DID...');
		const verified = await verifyDID(
			didResponse.did.ID,
			authResponse.signature,
			authResponse.proof
		);
		console.log('Verification result:', verified);

		console.log('Individual operations completed - 3 API calls made');
		return { didResponse, authResponse, verified };

	} catch (error) {
		console.error('Individual operations failed:', error);
		throw error;
	}
}

// Example 2: Batch Operations (Optimized Approach)
export async function demonstrateBatchOperations() {
	console.log('=== Batch Operations Demo ===');

	try {
		// Step 1: Batch Create DID and Issue Credential
		console.log('1. Creating DID and issuing credential (batch)...');
		const batchCreateResponse = await batchCreateDIDAndIssueCredential({
			name: 'Jane Doe',
			dob: '1995-05-15'
		});

		if (!batchCreateResponse.success) {
			throw new Error(batchCreateResponse.message);
		}

		console.log('DID Created and Credential Issued:', batchCreateResponse.did.ID);
		console.log('Message:', batchCreateResponse.message);

		// Step 2: Batch Authenticate and Verify
		console.log('2. Authenticating and verifying DID (batch)...');
		const batchAuthResponse = await batchAuthenticateAndVerifyDID({
			didId: batchCreateResponse.did.ID,
			privateKey: batchCreateResponse.privateKey,
			challenge: 'batch-demo-challenge-456'
		});

		if (!batchAuthResponse.success) {
			throw new Error(batchAuthResponse.message);
		}

		console.log('Authentication and Verification completed');
		console.log('Verified:', batchAuthResponse.verified);
		console.log('Message:', batchAuthResponse.message);

		console.log('Batch operations completed - 2 API calls made (50% reduction)');
		return { batchCreateResponse, batchAuthResponse };

	} catch (error) {
		console.error('Batch operations failed:', error);
		throw error;
	}
}

// Example 3: Performance Comparison
export async function performanceComparison() {
	console.log('=== Performance Comparison ===');

	const startTime = Date.now();

	// Time individual operations
	const individualStart = Date.now();
	try {
		await demonstrateIndividualOperations();
	} catch (error) {
		console.log('Individual operations failed, continuing with batch demo');
	}
	const individualTime = Date.now() - individualStart;

	// Time batch operations
	const batchStart = Date.now();
	try {
		await demonstrateBatchOperations();
	} catch (error) {
		console.log('Batch operations failed');
	}
	const batchTime = Date.now() - batchStart;

	const totalTime = Date.now() - startTime;

	console.log('\n=== Performance Results ===');
	console.log(`Individual Operations: ${individualTime}ms (3 API calls)`);
	console.log(`Batch Operations: ${batchTime}ms (2 API calls)`);
	console.log(`Total Demo Time: ${totalTime}ms`);
	console.log(`Potential Time Savings: ${individualTime - batchTime}ms`);
	console.log(`API Call Reduction: 33.3% (from 3 to 2 calls)`);
}

// Usage examples for different scenarios
export const usageExamples = {
	// When to use individual operations
	individual: {
		description: 'Use individual operations when you need fine-grained control or error handling between steps',
		scenarios: [
			'Testing individual components',
			'Debugging specific operations',
			'When operations need to be performed at different times',
			'When you need to modify data between operations'
		]
	},

	// When to use batch operations
	batch: {
		description: 'Use batch operations for better performance and reduced network overhead',
		scenarios: [
			'Production applications with high throughput',
			'Mobile applications with limited connectivity',
			'When operations are always performed together',
			'When you want to reduce API rate limiting impact'
		]
	}
};

// Helper function to determine which approach to use
export function recommendOperationMode(context: {
	networkCondition: 'fast' | 'slow' | 'limited';
	environment: 'development' | 'testing' | 'production';
	userFlow: 'interactive' | 'automated';
}): 'individual' | 'batch' {

	// In production with slow/limited network, always batch
	if (context.environment === 'production' &&
		(context.networkCondition === 'slow' || context.networkCondition === 'limited')) {
		return 'batch';
	}

	// For automated flows, prefer batching
	if (context.userFlow === 'automated') {
		return 'batch';
	}

	// For development/testing, individual operations might be better for debugging
	if (context.environment === 'development' || context.environment === 'testing') {
		return 'individual';
	}

	// Default to batch for better performance
	return shouldUseBatching() ? 'batch' : 'individual';
}