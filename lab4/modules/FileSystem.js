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

		fileInode.linkCount++;

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

	// • write fd size – записати size байт даних у відкритий файл, до значення зміщення
	// додається size.

	/**
	 *
	 * @param fd {number} - file descriptor
	 * @param data {Buffer} - data to write
	 */
	write(fd, data) {
		if (!this.openFileDescriptors.has(fd))
			throw new Error("Invalid file descriptor");

		const fileDescriptor = this.openFileDescriptors.get(fd);
		const inode = this.inodes[fileDescriptor.inodeNumber];

		if (inode.type === "d") {
			throw new Error("Cannot open directory for writing");
		}

		const file = new SimpleFile(inode);
		file.write(data, fileDescriptor.offset);
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

		const inodeNumber = this.currentDirectory.findInodeNumberByName(path);

		if (!inodeNumber) {
			throw new Error("File not found");
		}

		return this.inodes[inodeNumber];
	}

	stat(name) {
		const inode = this.getInodeByName(name);

		console.log(`\nFile ${name} stats:`);
		console.log(`Type: ${inode.type === "f" ? "File" : "Directory"}`);
		console.log(`Size: ${inode.size} bytes`);
		console.log(`Inode: ${inode.inodeNumber}`);
		console.log(`Links: ${inode.linkCount}`);
		console.log(`Created: ${new Date(inode.createdAt)}`);
		console.log(`Modified: ${new Date(inode.modifiedAt)}\n`);
	}

	open(name) {
		const inode = this.getInodeByName(name);
		const inodeNumber = inode.inodeNumber;
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

	/**
	 *
	 * @param {string} sourceFileName - source file link
	 * @param {string} targetFileName - target file link
	 */
	link(sourceFileName, targetFileName) {
		const sourceInode = this.getInodeByName(sourceFileName);

		const inodeNumber =
			this.currentDirectory.findInodeNumberByName(targetFileName);

		if (inodeNumber) {
			throw new Error("File name already exists");
		}

		this.currentDirectory.createDirectoryEntry(
			targetFileName,
			sourceInode.inodeNumber,
		);

		sourceInode.linkCount++;
	}

	/**
	 * Destroys a hard link to a file
	 * @param {string} name - file name of a hard link file
	 */
	unlink(name) {
		/**
		 * @type {Inode | undefined}
		 */
		let targetInode = undefined;

		try {
			targetInode = this.getInodeByName(name);
		} catch (e) {
			console.log(`Couldn't find an inode for ${name} file, skipping unlink`);
		}

		this.currentDirectory.directoryEntries.delete(name);

		targetInode.linkCount--;
		console.log(`Deleted hard link ${name}`);
	}

	/**
	 * @param {string} name - file descriptor
	 * @param {number} size - file descriptor
	 */
	truncate(name, size) {
		const inode = this.getInodeByName(name);

		if (!inode) throw new Error("File not found");

		const file = new SimpleFile(inode);

		file.truncate(size);
	}
}
