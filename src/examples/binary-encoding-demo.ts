/**
 * Binary Encoding Demo for WebAssembly Data Transfer
 * 
 * This file demonstrates the implementation of binary encoding
 * for data transfer between JavaScript and WebAssembly (WASM).
 */

import { cryptoWasm } from '@/lib/crypto-wasm';
import { DIDCrypto } from '@/app/api/did';

// Example 1: Key Generation with Binary Encoding
export async function demonstrateKeyGeneration() {
	console.log('=== Binary Key Generation Demo ===');

	// Generate a key pair using binary encoding
	const keyPair = await cryptoWasm.generateKeyPair();

	console.log('Generated Key Pair:');
	console.log('Private Key (Uint8Array):', keyPair.privateKey);
	console.log('Public Key (Uint8Array):', keyPair.publicKey);
	console.log('Private Key (hex):', cryptoWasm.uint8ArrayToHex(keyPair.privateKey));
	console.log('Public Key (hex):', cryptoWasm.uint8ArrayToHex(keyPair.publicKey));

	return keyPair;
}

// Example 2: Message Signing with Binary Data
export async function demonstrateMessageSigning() {
	console.log('\n=== Binary Message Signing Demo ===');

	// Generate key pair
	const keyPair = await cryptoWasm.generateKeyPair();

	// Create a message as binary data
	const message = 'Hello, WebAssembly with Binary Encoding!';
	const messageBytes = cryptoWasm.stringToUint8Array(message);

	console.log('Original message:', message);
	console.log('Message as Uint8Array:', messageBytes);
	console.log('Message as hex:', cryptoWasm.uint8ArrayToHex(messageBytes));

	// Sign the message using binary data
	const signature = await cryptoWasm.signMessage(keyPair.privateKey, messageBytes);

	console.log('Signature (Uint8Array):', signature);
	console.log('Signature (hex):', cryptoWasm.uint8ArrayToHex(signature));

	return { keyPair, messageBytes, signature };
}

// Example 3: Signature Verification with Binary Data
export async function demonstrateSignatureVerification() {
	console.log('\n=== Binary Signature Verification Demo ===');

	// Sign a message first
	const { keyPair, messageBytes, signature } = await demonstrateMessageSigning();

	// Verify the signature using binary data
	const isValid = await cryptoWasm.verifySignature(keyPair.publicKey, messageBytes, signature);

	console.log('Signature verification result:', isValid);

	// Test with tampered message
	const tamperedMessage = cryptoWasm.stringToUint8Array('Tampered message');
	const tamperedVerification = await cryptoWasm.verifySignature(keyPair.publicKey, tamperedMessage, signature);

	console.log('Tampered message verification result:', tamperedVerification);

	return { isValid, tamperedVerification };
}

// Example 4: Hash Function with Binary Data
export async function demonstrateHashing() {
	console.log('\n=== Binary Hashing Demo ===');

	const message = 'Data to be hashed';
	const messageBytes = cryptoWasm.stringToUint8Array(message);

	console.log('Original message:', message);
	console.log('Message as Uint8Array:', messageBytes);

	// Hash the message using binary data
	const hash = await cryptoWasm.hashMessage(messageBytes);

	console.log('Hash (Uint8Array):', hash);
	console.log('Hash (hex):', cryptoWasm.uint8ArrayToHex(hash));

	return hash;
}

// Example 5: Random Data Generation
export async function demonstrateRandomGeneration() {
	console.log('\n=== Binary Random Generation Demo ===');

	// Generate random data of different lengths
	const challenge32 = await cryptoWasm.generateChallenge(32);
	const challenge16 = await cryptoWasm.generateChallenge(16);
	const randomValue = await cryptoWasm.generateRandomValue();

	console.log('32-byte challenge (Uint8Array):', challenge32);
	console.log('32-byte challenge (hex):', cryptoWasm.uint8ArrayToHex(challenge32));
	console.log('16-byte challenge (Uint8Array):', challenge16);
	console.log('16-byte challenge (hex):', cryptoWasm.uint8ArrayToHex(challenge16));
	console.log('Random value (Uint8Array):', randomValue);
	console.log('Random value (hex):', cryptoWasm.uint8ArrayToHex(randomValue));

	return { challenge32, challenge16, randomValue };
}

// Example 6: Performance Comparison
export async function performanceComparison() {
	console.log('\n=== Performance Comparison: Binary vs String ===');

	const iterations = 100;
	const message = 'Performance test message for binary vs string encoding';

	// Test binary encoding performance
	console.time('Binary encoding operations');
	for (let i = 0; i < iterations; i++) {
		const keyPair = await DIDCrypto.generateKeyPairBinary();
		const messageBytes = DIDCrypto.stringToUint8Array(message);
		const signature = await DIDCrypto.signMessageBinary(keyPair.privateKey, messageBytes);
		await DIDCrypto.verifySignatureBinary(keyPair.publicKey, messageBytes, signature);
	}
	console.timeEnd('Binary encoding operations');

	// Test string encoding performance (legacy functions)
	console.time('String encoding operations');
	for (let i = 0; i < iterations; i++) {
		const { generateKeyPair, sign, verify } = await import('@/lib/crypto-wasm');
		const keyPair = await generateKeyPair();
		const signature = await sign(keyPair.privateKey, message);
		await verify(keyPair.publicKey, message, signature);
	}
	console.timeEnd('String encoding operations');
}

// Example 7: Data Conversion Utilities
export function demonstrateDataConversion() {
	console.log('\n=== Data Conversion Utilities Demo ===');

	// String to binary and back
	const originalString = 'Hello, Binary World! 🌍';
	const stringAsBytes = DIDCrypto.stringToUint8Array(originalString);
	const backToString = DIDCrypto.uint8ArrayToString(stringAsBytes);

	console.log('Original string:', originalString);
	console.log('As Uint8Array:', stringAsBytes);
	console.log('Back to string:', backToString);
	console.log('Conversion successful:', originalString === backToString);

	// Hex to binary and back
	const originalHex = '48656c6c6f2c20576f726c6421';
	const hexAsBytes = DIDCrypto.hexToUint8Array(originalHex);
	const backToHex = DIDCrypto.uint8ArrayToHex(hexAsBytes);

	console.log('Original hex:', originalHex);
	console.log('As Uint8Array:', hexAsBytes);
	console.log('Back to hex:', backToHex);
	console.log('Conversion successful:', originalHex === backToHex);

	return {
		stringConversion: { originalString, stringAsBytes, backToString },
		hexConversion: { originalHex, hexAsBytes, backToHex }
	};
}

// Main demonstration function
export async function runBinaryEncodingDemo() {
	console.log('🚀 Starting Binary Encoding Demo for WebAssembly Integration');
	console.log('='.repeat(60));

	try {
		await demonstrateKeyGeneration();
		await demonstrateMessageSigning();
		await demonstrateSignatureVerification();
		await demonstrateHashing();
		await demonstrateRandomGeneration();
		demonstrateDataConversion();
		await performanceComparison();

		console.log('\n✅ Binary Encoding Demo completed successfully!');
		console.log('All examples demonstrate the use of Uint8Array for optimized data transfer');
		console.log('between JavaScript and WebAssembly.');

	} catch (error) {
		console.error('❌ Demo failed:', error);
		throw error;
	}
}

// Export utility functions for use in other parts of the application
export const BinaryEncodingUtils = {
	// Conversion utilities
	stringToUint8Array: DIDCrypto.stringToUint8Array,
	uint8ArrayToString: DIDCrypto.uint8ArrayToString,
	hexToUint8Array: DIDCrypto.hexToUint8Array,
	uint8ArrayToHex: DIDCrypto.uint8ArrayToHex,

	// Crypto operations with binary data
	generateKeyPair: DIDCrypto.generateKeyPairBinary,
	signMessage: DIDCrypto.signMessageBinary,
	verifySignature: DIDCrypto.verifySignatureBinary,
	hashMessage: DIDCrypto.hashMessageBinary,
	generateChallenge: DIDCrypto.generateChallengeBinary,

	// Demo functions
	runDemo: runBinaryEncodingDemo,
	performanceTest: performanceComparison,
};