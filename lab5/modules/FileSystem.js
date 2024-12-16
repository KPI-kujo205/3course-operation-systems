import * as constants from "node:constants";
import { Directory } from "./Directory.js";
import { Inode, InodeType } from "./Inode.js";
import { SimpleFile } from "./SimpleFile.js";
import { SymLink } from "./SymLink.js";
import { Utils } from "./Utils.js";
import { FSConfig } from "./fsConfig.js";

export class FileSystem {
	/** @type Directory */
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

		setInterval(() => {
			this.purgeClosedFilesWithoutLinks();
		}, 500);
	}

	purgeClosedFilesWithoutLinks() {
		this.currentDirectory.directoryEntries.forEach((entry, key) => {
			const inode = this.inodes[entry];

			if (!inode) return;
			if (this.openFileDescriptors.has(inode?.inodeNumber)) return;

			if (inode.linkCount === 0) {
				for (const index of inode.directLinkIndeces) {
					this.blocks[index] = null;
					this.blockBitmap[index] = false;
				}
			}
		});
	}

	/**
	 * Initializes the root directory, 1st inode in the system
	 * @return {Directory} - root directory
	 */
	initializeRootDirectory() {
		this.inodes[0] = this.getFreeInode(InodeType.DIRECTORY);
		return new Directory(this.inodes[0], "/");
	}

	/**
	 * Allocates 5 blocks for inode
	 * @returns {{blocks: ArrayBuffer[], indeces: number[]}}
	 */
	allocateInodeBlocks() {
		const data = [
			this.allocateBlock(),
			this.allocateBlock(),
			this.allocateBlock(),
			this.allocateBlock(),
			this.allocateBlock(),
		];

		const indeces = data.map((b) => b.index);
		const blocks = data.map((b) => b.block);

		return {
			blocks,
			indeces,
		};
	}

	/**
	 * Allocates new empty block
	 * @returns {{index: number, block: ArrayBuffer}}
	 */
	allocateBlock() {
		const freeBlockCandidate = this.blockBitmap.findIndex((b) => !b);

		if (freeBlockCandidate === -1)
			throw new Error("No free blocks left in the system, free up some files");

		const block = new ArrayBuffer(FSConfig.BLOCK_SIZE);
		this.blocks[freeBlockCandidate] = block;
		this.blockBitmap[freeBlockCandidate] = true;

		return { index: freeBlockCandidate, block };
	}

	/**
	 * type {@type InodeType} - 'f' for file, 'd' for directory, 'l' for symlink
	 * @return {Inode} - newly created Inode
	 */
	getFreeInode(type) {
		const freeInodeIndex = this.inodeBitmap.findIndex((b) => !b);

		const data = this.allocateInodeBlocks();

		const inode = new Inode(type, data.blocks, freeInodeIndex, data.indeces);
		this.inodes[freeInodeIndex] = inode;

		this.inodeBitmap[freeInodeIndex] = true;

		return inode;
	}

	create(name) {
		const { lastSegment, parentPath } = Utils.getLastAndParentPathSegment(name);
		const parentDirectory = this.resolvePath(parentPath);

		if (parentDirectory.directoryEntries.has(lastSegment)) {
			throw new Error("File already exists");
		}

		if (name.length > FSConfig.MAX_FILENAME_LENGTH)
			throw new Error(
				`Filename \`${name}\` exceeds \`${FSConfig.MAX_FILENAME_LENGTH}\` chars`,
			);

		const fileInode = this.getFreeInode(InodeType.FILE);

		fileInode.linkCount++;

		parentDirectory.createDirectoryEntry(lastSegment, fileInode.inodeNumber);
	}

	ls() {
		const padRight = (str, length) => str.padEnd(length, " ");
		const padLeft = (str, length) => str.padStart(length, " ");

		console.log(`\nContents of \`${this.currentDirectory.name}\` directory:`);
		console.log(
			`${padRight("Name", 20)}\t${padRight("Type", 5)}\t${padRight("Inode", 5)}`,
		);

		this.currentDirectory.directoryEntries.forEach((inodeNumber, name) => {
			let entryName = name;
			const inode = this.inodes[inodeNumber];
			const type = inode.type;

			if (type === InodeType.SYMLINK) {
				const symlink = new SymLink(inode);
				entryName = `${name} -> ${symlink.content}`;
			}
			console.log(
				`${padRight(entryName, 20)}\t${padRight(type, 5)}\t${padLeft(inode.inodeNumber.toString(), 5)}`,
			);
		});
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

		if (inode.type === "l") {
			const symlink = new SymLink(inode);

			const contentInode = this.getInodeByName(symlink.content);

			if (contentInode.type === InodeType.DIRECTORY) {
				throw new Error("Cannot open directory for reading");
			}

			const file = new SimpleFile(contentInode);

			return file.read(size, fileDescriptor.offset);
		}

		if (inode.type === "f") {
			const file = new SimpleFile(inode);
			return file.read(size, fileDescriptor.offset);
		}

		throw new Error(`Unknown file type \`${inode.type}\``);
	}

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
		const { lastSegment, parentPath } = Utils.getLastAndParentPathSegment(path);

		const dir = this.resolvePath(parentPath);

		const fileInodeNumber = dir.directoryEntries.get(lastSegment);

		if (!fileInodeNumber)
			throw new Error(
				`File \`${path}\` not found while trying to get an inode by path`,
			);

		return this.inodes[fileInodeNumber];
	}

	stat(name) {
		const inode = this.getInodeByName(name);

		const text = `
    File ${name} stats:
    Type: ${inode.type === "f" ? "File" : "Directory"}
    Size: ${inode.size} bytes
    Inode: ${inode.inodeNumber}
    Links: ${inode.linkCount}
    Created: ${new Date(inode.createdAt)}
    Modified: ${new Date(inode.modifiedAt)}
    `;
		console.log(text);
		return text;
	}

	open(name) {
		const { lastSegment, parentPath } = Utils.getLastAndParentPathSegment(name);
		const parentDirectory = this.resolvePath(parentPath);

		if (!parentDirectory.directoryEntries.has(lastSegment)) {
			throw new Error("File not found");
		}

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
	}

	/**
	 *
	 * @param {string} sourceFileName - source file link
	 * @param {string} targetFileName - target file link
	 */
	link(sourceFileName, targetFileName) {
		const sourceInode = this.getInodeByName(sourceFileName);

		if (sourceInode.type === InodeType.DIRECTORY)
			throw new Error("Cannot create a hard link to a directory");

		const inodeNumber =
			this.currentDirectory.findInodeNumberByName(targetFileName);

		if (!inodeNumber) {
			throw new Error(
				`Cannot make a hard link to a non-existing file named \`${targetFileName}\``,
			);
		}

		this.currentDirectory.directoryEntries.set(
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
			return console.log(
				`Couldn't find an inode for ${name} file, skipping unlink`,
			);
		}

		console.log(this.currentDirectory.directoryEntries);
		this.currentDirectory.directoryEntries.delete(name);

		console.log(this.currentDirectory.directoryEntries);

		targetInode.linkCount--;
		console.log(`Deleted hard link ${name}`);
	}

	/**
	 * @param {string} name - file name
	 * @param {number} size - new file size
	 */
	truncate(name, size) {
		const inode = this.getInodeByName(name);

		if (!inode) throw new Error("File not found");

		const file = new SimpleFile(inode);

		file.inode._size = size;

		if (size < file.inode.actualSize) {
			// reduce the size
			const links = file.inode.directLinks;
			const chunkSize = FSConfig.BLOCK_SIZE;
			const blockIndex = Math.floor(size / chunkSize);
			const blockOffset = size % chunkSize;

			links.length = blockIndex + 1;

			if (blockOffset === 0) {
				return;
			}

			const lastBlock = new Uint8Array(links[blockIndex]);
			const newLastBlock = lastBlock.slice(0, blockOffset);

			links[blockIndex] = newLastBlock.buffer;
		} else if (size > file.inode.actualSize) {
			const chunkSize = FSConfig.BLOCK_SIZE;
			const additionalSize = size - file.inode.actualSize;
			const additionalBlocks = Math.ceil(additionalSize / chunkSize);

			for (let i = 0; i < additionalBlocks; i++) {
				const block = this.allocateBlock();
				file.addNewDirectLink(block.index, block.block);
				this.blockBitmap[block.index] = true;
			}
		}
	}

	/**
	 * Removes a file
	 * @param {string} path - path to be resolved
	 */
	rm(path) {
		const sanitizePath = Utils.sanitizePath(path);
		const components = sanitizePath.split("/");
		const fileName = components.pop();

		const dir = this.resolvePath(components.join("/"));
		const fileInodeNumber = dir.directoryEntries.get(fileName);

		if (!fileInodeNumber)
			throw new Error(
				`File \`${path}\` not found while trying to delete a file`,
			);

		const fileInode = this.inodes[fileInodeNumber];

		if (fileInode.type !== InodeType.FILE) {
			throw new Error(`\`${path}\` is not a file`);
		}

		// If file has more than 1 link, just remove the directory entry
		if (fileInode.linkCount > 1) {
			fileInode.linkCount--;
			dir.directoryEntries.delete(fileName);
			dir.save();
			console.log(`\nHard link \`${path}\` removed successfully`);
			return;
		}

		dir.directoryEntries.delete(fileName);
		dir.save();

		fileInode.directLinks.forEach((_, index) => {
			this.blocks[fileInode.directLinkIndeces[index]] = null;
			this.blockBitmap[fileInode.directLinkIndeces[index]] = false;
		});

		this.inodes[fileInode.inodeNumber] = null;
		this.inodeBitmap[fileInode.inodeNumber] = false;

		console.log(`\nFile \`${path}\` removed successfully`);
	}

	/**
	 * Resolves a directory path, don't use for files
	 * @param {string} path - path to be resolved
	 */
	resolvePath(path) {
		const sanitizedPath = Utils.sanitizePath(path);

		if (sanitizedPath === "/") {
			const inode = this.inodes[0];
			return new Directory(inode);
		}

		const components = sanitizedPath.split("/");

		let current = this.currentDirectory;
		let symlinkCount = 0;
		const maxSymlinkCount = 10; // Prevent infinite loops

		for (const component of components) {
			if (component === "" || component === ".") continue; // Skip empty or current dir
			if (component === "..") {
				// Move to parent, if exists
				if (typeof current.parentInodeNumber === "number") {
					const inode = this.inodes[current.parentInodeNumber];
					current = new Directory(inode);
				}
				continue;
			}

			const inodeNumber = current.findInodeNumberByName(component);
			if (!inodeNumber) throw new Error(`Path \`${path}\` cannot be resolved`);
			const inode = this.inodes[inodeNumber];

			if (inode.type === InodeType.SYMLINK) {
				if (++symlinkCount > maxSymlinkCount)
					throw new Error("Too many symlinks");

				const symlink = new SymLink(inode);
				const targetPath = symlink.content;

				return this.resolvePath(targetPath); // Resolve symlink target
			}

			current = new Directory(inode);
		}

		return current;
	}

	/**
	 *
	 * @param {string} path - path of a new dir to be resolved
	 */
	mkdir(path) {
		/**
		 * @type {Directory | undefined}
		 */
		let resolvedPath;

		const newPathHasSlash = path.includes("/");

		if (!newPathHasSlash) {
			path = `./${path}`;
		}

		try {
			resolvedPath = this.resolvePath(path);
		} catch (e) {}

		if (resolvedPath) throw new Error(`Directory \`${path}\` already exists`);

		const pathWithoutLastComponent = path.split("/").slice(0, -1).join("/");
		const dirName = path.split("/").pop();

		const parentDirectory = this.resolvePath(pathWithoutLastComponent);

		const dirInode = this.getFreeInode(InodeType.DIRECTORY);

		new Directory(dirInode, dirName, parentDirectory.inode.inodeNumber);

		parentDirectory.createDirectoryEntry(dirName, dirInode.inodeNumber);
	}

	rmdir(path) {
		const sanitizePath = Utils.sanitizePath(path);
		const directory = this.resolvePath(path);

		if (!directory.isEmpty()) {
			throw new Error(
				`Directory \`${path}\` is not empty, first remove all the files`,
			);
		}

		if (path === "/") {
			throw new Error(
				"Cannot remove root directory as it would render the filesystem unusable",
			);
		}

		const { lastSegment, parentPath } =
			Utils.getLastAndParentPathSegment(sanitizePath);

		const parentDirectory = this.resolvePath(parentPath);

		parentDirectory.directoryEntries.delete(lastSegment);
		parentDirectory.save();

		const inode = directory.inode;
		inode.directLinks.forEach((_, index) => {
			this.blocks[inode.directLinkIndeces[index]] = null;
			this.blockBitmap[inode.directLinkIndeces[index]] = false;
		});

		this.inodes[inode.inodeNumber] = null;
		this.inodeBitmap[inode.inodeNumber] = false;

		console.log(`\nDirectory \`${path}\` removed successfully`);
	}

	cd(path) {
		this.currentDirectory = this.resolvePath(path);
	}

	/**
	 * @param {string} content - content of the symlink
	 * @param {string} symLinkPath - path to the symlink
	 */
	symlink(content, symLinkPath) {
		let inode;

		try {
			const inode = this.getInodeByName(symLinkPath);
		} catch (e) {}

		if (inode) throw new Error(`File \`${symLinkPath}\` already exists`);

		const sanitizedPath = Utils.sanitizePath(symLinkPath);

		const { lastSegment, parentPath } =
			Utils.getLastAndParentPathSegment(sanitizedPath);

		const freeSymLinkInode = this.getFreeInode("l");

		new SymLink(freeSymLinkInode, content);

		const parentDirectory = this.resolvePath(parentPath);

		parentDirectory.createDirectoryEntry(
			lastSegment,
			freeSymLinkInode.inodeNumber,
		);
	}
}
