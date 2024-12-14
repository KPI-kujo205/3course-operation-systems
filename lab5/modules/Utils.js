// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class Utils {
	/**
	 * @param {ArrayBuffer[]} links
	 * @param {{includeTrailingZeros:boolean}} config
	 * @returns {Uint8Array}
	 */
	static readArrayBuffers(links, config = { includeTrailingZeros: false }) {
		let result = new Uint8Array();

		for (const link of links) {
			const view = new Uint8Array(link);
			result = new Uint8Array([...result, ...view]);
		}

		if (config.includeTrailingZeros) {
			return result;
		}

		let firstNonZeroIndex = 0;

		while (
			firstNonZeroIndex < result.length &&
			result[firstNonZeroIndex] === 0
		) {
			firstNonZeroIndex++;
		}

		// Find the last non-zero character
		let lastNonZeroIndex = result.length - 1;
		while (lastNonZeroIndex >= 0 && result[lastNonZeroIndex] === 0) {
			lastNonZeroIndex--;
		}

		// Create a new Uint8Array excluding trailing zeros
		return result.slice(firstNonZeroIndex, lastNonZeroIndex + 1);
	}
}
