export class Inode {
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
	 * @type
	 */
	constructor(type, blocks, inodeNumber) {
		this.type = type; // 'f' for file, 'd' for directory
		this.directLinks = blocks;
		this.linkCount = 0;
		this.inodeNumber = inodeNumber;
		this.createdAt = Date.now();
		this.modifiedAt = Date.now();
	}
}
