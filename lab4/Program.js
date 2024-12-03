import { FileSystem } from "./modules/FileSystem.js";

class Program {
	/**
	 * File system instance
	 * @type {FileSystem}
	 */
	fs;

	constructor() {
		this.mkfs(10);
	}

	/**
	 * Initialize file system
	 * @param {number} n - number of file descriptors
	 * @return void
	 * */
	mkfs(n) {
		this.fs = new FileSystem(n, "test");
	}
}

export default new Program();
