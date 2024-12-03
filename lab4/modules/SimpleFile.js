import { FSConfig } from "./fsConfig.js";

export class SimpleFile {
	/**
	 * {@type Inode}
	 * */
	inode;

	/**
	 * @param {Inode} inode
	 * */
	constructor(inode) {
		this.inode = inode;
	}

	/**
	 * Reads data from an array of direct links from offset to the end
	 * @param {number} offset
	 * @param {number} size - number of bytes to read
	 * @returns {string}
	 */
	read(size = undefined, offset = 0) {
		const links = this.inode.directLinks;
		let result = new Uint8Array();

		// Read all data
		for (const link of links) {
			const view = new Uint8Array(link);
			result = new Uint8Array([...result, ...view]);
		}

		const finalResult = result.slice(offset, offset + size);

		// Return data from the offset to the end
		return new TextDecoder().decode(finalResult);
	}

	/**
	 * Writes data to an array of direct links
	 * @param {Buffer} data
	 */
	write(data) {
		console.log("writing data", data);

		const links = this.inode.directLinks;
		const chunkSize = FSConfig.BLOCK_SIZE;

		if (data.length > chunkSize * links.length) {
			throw new Error("File size exceeds maximum limit");
		}

		for (let i = 0; i < data.length; i += chunkSize) {
			const chunk = data.slice(i, i + chunkSize);
			const buffer = new ArrayBuffer(chunkSize);
			const view = new Uint8Array(buffer);
			view.set(chunk);
			links[Math.floor(i / chunkSize)] = buffer;
		}
	}
}
