import { Directory } from "./Directory.js";
import { Inode } from "./Inode.js";
import { SimpleFile } from "./SimpleFile.js";
import { FSConfig } from "./fsConfig.js";

export class FileSystem {
	/**
	 * @type Directory
	 */
	currentDirectory;

	/**
	 * @type {Map<number, {inodeNumber: number, offset: number}>}
	 */
	openFileDescriptors;

	/**
	 * @type {Inode[]}
	 */
	inodes;

	/**
	 * @type {boolean[]}
	 */
	blockBitmap;

	constructor() {
		this.inodeBitmap = new Array(FSConfig.MAX_INODES).fill(false);
		this.inodes = new Array(FSConfig.MAX_INODES).fill(null);

		this.blockBitmap = new Array(FSConfig.MAX_BLOCKS).fill(false);
		this.blocks = new Array(FSConfig.MAX_BLOCKS).fill(null);

		this.openFileDescriptors = new Map();
		this.nextFd = 0;

		this.blocks[0] = []; // Root directory entries

		this.currentDirectory = this.initializeRootDirectory();
	}

	/**
	 * Initializes the root directory, 1st inode in the system
	 * @return {Directory} - root directory
	 */
	initializeRootDirectory() {
		this.inodes[0] = this.getFreeInode("d");
		return new Directory(this.inodes[0], "/");
	}

	/**
	 * Allocates 5 blocks for an inode
	 * @returns {ArrayBuffer[]}
	 */
	allocateInodeBlocks() {
		/** @type {ArrayBuffer[]} */
		return [
			this.allocateBlock(),
			this.allocateBlock(),
			this.allocateBlock(),
			this.allocateBlock(),
			this.allocateBlock(),
		];
	}

	allocateBlock() {
		const freeBlockCandidate = this.blockBitmap.findIndex((b) => !b);

		if (freeBlockCandidate === -1)
			throw new Error("No free blocks left in the system, free up some files");

		const block = new ArrayBuffer(FSConfig.BLOCK_SIZE);
		this.blocks[freeBlockCandidate] = block;
		this.blockBitmap[freeBlockCandidate] = true;

		return block;
	}

	/**
	 * type {@type 'f' | 'd'} - 'f' for file, 'd' for directory
	 * @return {Inode} - newly created Inode
	 */
	getFreeInode(type) {
		const freeInodeIndex = this.inodeBitmap.findIndex((b) => !b);
		const links = this.allocateInodeBlocks();

		const inode = new Inode(type, links, freeInodeIndex);
		this.inodes[freeInodeIndex] = inode;

		this.inodeBitmap[freeInodeIndex] = true;

		return inode;
	}

	create(name) {
		if (name.includes("/")) {
			throw new Error(
				"You cannot use `/` in the filename, directory creation is not supported in the current version",
			);
		}

		if (name.length > FSConfig.MAX_FILENAME_LENGTH)
			throw new Error(
				`Filename \`${name}\` exceeds \`${FSConfig.MAX_FILENAME_LENGTH}\` chars`,
			);

		const fileInode = this.getFreeInode("f");

		this.currentDirectory.createDirectoryEntry(name, fileInode.inodeNumber);
	}

	ls() {
		this.currentDirectory.ls();
	}

	/**
	 * @param {number} fd
	 * @param {number} size
	 */
	read(fd, size) {
		if (!this.openFileDescriptors.has(fd))
			throw new Error("Invalid file descriptor");

		const fileDescriptor = this.openFileDescriptors.get(fd);

		const inode = this.inodes[fileDescriptor.inodeNumber];

		if (inode.type === "d") {
			throw new Error("Cannot open directory for reading");
		}

		const file = new SimpleFile(inode);

		return file.read(size, fileDescriptor.offset);
	}

	/**
	 *
	 * @param fd {number} - file descriptor
	 * @param data {Buffer} - data to write
	 */
	write(fd, data) {
		if (!this.openFileDescriptors.has(fd))
			throw new Error("Invalid file descriptor");

		const inode = this.inodes[this.openFileDescriptors.get(fd).inodeNumber];

		if (inode.type === "d") {
			throw new Error("Cannot open directory for reading");
		}

		const file = new SimpleFile(inode);
		file.write(data);
	}

	/**
	 * @param {string} path
	 */
	getInodeByName(path) {
		if (path === "/" || path === ".") return this.currentDirectory.inode;

		if (path.split("/").length > 1) {
			throw new Error(
				"Directory creation is not supported in the current version",
			);
		}

		return this.currentDirectory.findEntryByName(path);
	}

	stat(name) {
		const inodeNumber = this.getInodeByName(name);
		const inode = this.inodes[inodeNumber];
		console.log(`File: ${name}`);
		console.log(`Type: ${inode.type === "f" ? "File" : "Directory"}`);
		console.log(`Size: ${inode.size} bytes`);
		console.log(`Inode: ${inodeNumber}`);
		console.log(`Links: ${inode.linkCount}`);
		console.log(`Created: ${new Date(inode.createdAt)}`);
		console.log(`Modified: ${new Date(inode.modifiedAt)}`);
	}

	open(name) {
		const inodeNumber = this.getInodeByName(name);
		const fd = this.nextFd++;
		this.openFileDescriptors.set(fd, { inodeNumber, offset: 0 });
		console.log(`File ${name} opened with descriptor ${fd}`);
		return fd;
	}

	close(fd) {
		if (!this.openFileDescriptors.has(fd))
			throw new Error("Invalid file descriptor");
		this.openFileDescriptors.delete(fd);
	}

	seek(fd, offset) {
		if (!this.openFileDescriptors.has(fd))
			throw new Error("Invalid file descriptor");
		this.openFileDescriptors.get(fd).offset = offset;
		console.log(`Seek for file descriptor ${fd} set to ${offset}`);
	}

	// link(name1, name2) {
	// 	const sourceInodeNumber = this.getInodeByNane(name1);
	// 	const targetDirInode = this.inodes[this.currentDirectoryInode];
	// 	const targetDirEntries = this.blocks[targetDirInode.directLinks[0]];
	//
	// 	if (targetDirEntries.find((e) => e.name === name2))
	// 		throw new Error("Target name already exists");
	//
	// 	targetDirEntries.push(new DirectoryEntry(name2, sourceInodeNumber));
	// 	this.inodes[sourceInodeNumber].linkCount++;
	// 	console.log(`Created hard link ${name2} -> ${name1}`);
	// }
	//
	// unlink(name) {
	// 	const dirInode = this.inodes[this.currentDirectoryInode];
	// 	const dirEntries = this.blocks[dirInode.directLinks[0]];
	// 	const entryIndex = dirEntries.findIndex((e) => e.name === name);
	//
	// 	if (entryIndex === -1) throw new Error("File not found");
	//
	// 	const inodeNumber = dirEntries[entryIndex].inodeNumber;
	// 	dirEntries.splice(entryIndex, 1);
	//
	// 	this.inodes[inodeNumber].linkCount--;
	// 	if (this.inodes[inodeNumber].linkCount === 0) {
	// 		this.freeInode(inodeNumber);
	// 	}
	//
	// 	console.log(`Unlinked ${name}`);
	// }
	//
	// truncate(name, size) {
	// 	const inodeNumber = this.getInodeByPath(name);
	// 	const inode = this.inodes[inodeNumber];
	//
	// 	if (size < inode.size) {
	// 		const newLastBlockIndex = Math.floor((size - 1) / BLOCK_SIZE);
	// 		for (let i = newLastBlockIndex + 1; i < inode.directLinks.length; i++) {
	// 			if (inode.directLinks[i]) {
	// 				this.freeBlock(inode.directLinks[i]);
	// 				inode.directLinks[i] = 0;
	// 			}
	// 		}
	// 		if (inode.indirectLink) {
	// 			const indirectBlock = this.blocks[inode.indirectLink];
	// 			for (
	// 				let i = Math.max(0, newLastBlockIndex - 2);
	// 				i < BLOCK_SIZE / 4;
	// 				i++
	// 			) {
	// 				const blockNumber = indirectBlock.readUInt32LE(i * 4);
	// 				if (blockNumber) {
	// 					this.freeBlock(blockNumber);
	// 					indirectBlock.writeUInt32LE(0, i * 4);
	// 				}
	// 			}
	// 			if (newLastBlockIndex < 3) {
	// 				this.freeBlock(inode.indirectLink);
	// 				inode.indirectLink = 0;
	// 			}
	// 		}
	// 	} else if (size > inode.size) {
	// 		const lastBlockIndex = Math.floor((size - 1) / BLOCK_SIZE);
	// 		for (
	// 			let i = Math.floor(inode.size / BLOCK_SIZE) + 1;
	// 			i <= lastBlockIndex;
	// 			i++
	// 		) {
	// 			if (i < 3) {
	// 				if (!inode.directLinks[i]) {
	// 					inode.directLinks[i] = this.allocateBlock();
	// 				}
	// 			} else {
	// 				if (!inode.indirectLink) {
	// 					inode.indirectLink = this.allocateBlock();
	// 				}
	// 				const indirectBlock = this.blocks[inode.indirectLink];
	// 				if (!indirectBlock.readUInt32LE((i - 3) * 4)) {
	// 					const newBlockNumber = this.allocateBlock();
	// 					indirectBlock.writeUInt32LE(newBlockNumber, (i - 3) * 4);
	// 				}
	// 			}
	// 		}
	// 	}
	//
	// 	inode.size = size;
	// 	inode.modifiedAt = Date.now();
	// 	console.log(`Truncated ${name} to ${size} bytes`);
	// }
}
