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
}
