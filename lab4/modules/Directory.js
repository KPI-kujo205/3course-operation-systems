import { Utils } from "./Utils.js";
import { FSConfig } from "./fsConfig.js";

export class Directory {
	/**
	 * @type string
	 */
	name;

	/**
	 * @type Inode
	 */
	inode;

	/**
	 * @type {Map<string, number>}
	 */
	directoryEntries = new Map();

	/**
	 * @param {Inode} inode - directory inode
	 * @param {string} name - name of a directory (will be @deprecated)
	 * */
	constructor(inode, name) {
		this.inode = inode;
		this.name = name;

		try {
			const dataUnderInode = this.read();

			console.log("dataUnderInode", dataUnderInode);
			if (!dataUnderInode) {
				this.directoryEntries = new Map();
				this.createDirectoryEntry(".", this.inode.inodeNumber);
			}
		} catch (e) {}
	}

	ls() {
		console.log(`Contents of ${this.name} directory:`);

		for (const [name, inodeNumber] of this.directoryEntries) {
			console.log(`- ${name} (inode: ${inodeNumber})`);
		}
	}

	/**
	 * Reads data from an array of direct links
	 * @returns {Map<string, number> | null}
	 * */
	read() {
		const links = this.inode.directLinks;

		const textDecoder = new TextDecoder();

		const result = Utils.readArrayBuffersWithoutTrailingZeros(links);

		const decodedStr = textDecoder.decode(result);

		if (!decodedStr) {
			return null;
		}

		return JSON.parse(decodedStr);
	}

	/**
	 * Creates directory entry and points it to an inode
	 * @param {string} name
	 * @param inode {number}
	 */
	createDirectoryEntry(name, inode) {
		if (this.directoryEntries.has(name)) {
			throw new Error("File already exists");
		}

		this.directoryEntries.set(name, inode);
		this.save();
	}

	/**
	 * Saves directory entries to inode direct links
	 */
	save() {
		const jsonString = JSON.stringify(this.directoryEntries);
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

	/**
	 * Find an entry by name
	 * @param {string} name
	 * @returns {number}
	 */
	findEntryByName(name) {
		const entry = this.directoryEntries.get(name);

		if (!entry) {
			throw new Error(`Entry with name \`${name}\` not found in directory`);
		}

		return entry;
	}
}
