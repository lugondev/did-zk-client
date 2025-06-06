/**
 * Generates a random alphanumeric string for QR code placeholder data
 * @param length - The desired length of the random string (default: 32)
 * @returns A random string containing alphanumeric characters
 */
export function generateRandomData(length: number = 32): string {
	let result = '';

	// Generate random characters until we reach the desired length
	while (result.length < length) {
		// Math.random().toString(36) generates a random string with digits and letters
		// We slice from index 2 to remove the '0.' prefix
		result += Math.random().toString(36).substring(2);
	}

	// Trim to exact length and return
	return result.substring(0, length);
}