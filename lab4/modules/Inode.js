import { Utils } from "./Utils.js";

export class Inode {
	/**
	 * size of the file in bytes
	 * @type {number}
	 */
	_size = 0;

	/**
	 * @type {ArrayBuffer[]}
	 */
	directLinks = [];

	/**
	 * @type {number}
	 */
	inodeNumber;

	/**
	 * @param {'f'|'d'} type  - direct and indirect block links, stored in RAM
	 * @param {ArrayBuffer[]} blocks  - direct and indirect block links, stored in RAM
	 * @param {number} inodeNumber  - number of the inode
	 */
	constructor(type, blocks, inodeNumber) {
		this.type = type; // 'f' for file, 'd' for directory
		this.directLinks = blocks;
		this.linkCount = 0;
		this.inodeNumber = inodeNumber;
		this.createdAt = Date.now();
		this.modifiedAt = Date.now();
		this._size = 0;
	}

	get actualSize() {
		return Utils.readArrayBuffers(this.directLinks).byteLength;
	}

	get size() {
		return Math.max(this.actualSize, this._size);
	}
}
