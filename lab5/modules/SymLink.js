import { Inode } from "./Inode.js";
import { Utils } from "./Utils.js";
import { FSConfig } from "./fsConfig.js";

export class SymLink {
	/**
	 * @type Inode
	 * */
	inode;

	/**
	 * @type string
	 * */
	content;

	/**
	 * @param {Inode} inode
	 * @param {string} [content]
	 * */
	constructor(inode, content) {
		this.inode = inode;
		this.content = content;

		try {
			const dataUnderInode = this.read();

			if (!dataUnderInode) {
				this.save();
			} else {
				this.content = dataUnderInode.content;
			}
		} catch (e) {
			console.error(e?.message);
		}
	}

	/**
	 * Reads data from an array of direct links
	 * @returns {SymLink}
	 * */
	read() {
		const links = this.inode.directLinks;

		const textDecoder = new TextDecoder();

		const result = Utils.readArrayBuffers(links);

		const decodedStr = textDecoder.decode(result);

		if (!decodedStr) {
			return null;
		}

		return JSON.parse(decodedStr);
	}

	save() {
		const jsonString = JSON.stringify(JSON.parse(JSON.stringify(this)));

		const encodedData = new TextEncoder().encode(jsonString);
		const chunkSize = FSConfig.BLOCK_SIZE;

		if (encodedData.length > chunkSize * this.inode.directLinks.length) {
			throw new Error("Data size exceeds maximum limit");
		}

		for (let i = 0; i < encodedData.length; i += chunkSize) {
			const chunk = encodedData.slice(i, i + chunkSize);
			const buffer = new ArrayBuffer(chunkSize);
			const view = new Uint8Array(buffer);
			view.set(chunk);
			this.inode.directLinks[Math.floor(i / chunkSize)] = buffer;
		}
	}

	// /**
	//  * Reads data from an array of direct links from offset to the end
	//  * @param {number} offset
	//  * @param {number} size - number of bytes to read
	//  * @returns {string}
	//  */
	// read(size = undefined, offset = 0) {
	// 	const links = this.inode.directLinks;
	// 	let result = new Uint8Array();
	//
	// 	// Read all data
	// 	for (const link of links) {
	// 		const view = new Uint8Array(link);
	// 		result = new Uint8Array([...result, ...view]);
	// 	}
	//
	// 	const finalResult = result.slice(offset, offset + size);
	//
	// 	// Return data from the offset to the end
	// 	return new TextDecoder().decode(finalResult);
	// }
	//
	// /**
	//  * Writes data to an array of direct links
	//  * @param {Buffer} data - data to write
	//  * @param {number} offset - offset to start writing from
	//  */
	// write(data, offset) {
	// 	const links = this.inode.directLinks;
	// 	const chunkSize = FSConfig.BLOCK_SIZE;
	//
	// 	// Calculate the starting block and offset within the block
	// 	let blockIndex = Math.floor(offset / chunkSize);
	// 	let blockOffset = offset % chunkSize;
	//
	// 	if (data.length + offset > chunkSize * links.length) {
	// 		throw new Error("File size exceeds maximum limit");
	// 	}
	//
	// 	for (let i = 0; i < data.length; i++) {
	// 		if (blockOffset === chunkSize) {
	// 			blockIndex++;
	// 			blockOffset = 0;
	// 		}
	//
	// 		if (!links[blockIndex]) {
	// 			links[blockIndex] = new ArrayBuffer(chunkSize);
	// 		}
	//
	// 		const view = new Uint8Array(links[blockIndex]);
	// 		view[blockOffset] = data[i];
	// 		blockOffset++;
	// 	}
	// }
	//
	// /**
	//  * Truncates the file to a specified length
	//  * @param {number} index - direct link index
	//  * @param {ArrayBuffer} directLink - new direct link array buffer
	//  */
	// addNewDirectLink(index, directLink) {
	// 	this.inode.directLinkIndeces.push(index);
	// 	this.inode.directLinks.push(directLink);
	// }
}
