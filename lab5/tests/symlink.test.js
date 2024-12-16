import { FileSystem } from "../modules/FileSystem.js";

import { beforeEach, describe, expect, test } from "@jest/globals";

/**
 * @type {FileSystem}
 */
let fs;

beforeEach(() => {
	fs = new FileSystem();
	console.log("Setting up the test environment...");
});

describe("Sym Link Operations", () => {
	const text = "012345678910";
	test("Symlink is being created", () => {
		fs.create("example1.txt");
		fs.create("example2.txt");

		fs.symlink("example1.txt", "symlink");

		expect(fs.currentDirectory.directoryEntries.get("symlink")).toBeDefined();
	});

	test("Can read data pointed by a symlink in another dir", () => {
		fs.mkdir("dir1");

		fs.create("dir1/example1.txt");

		const fd = fs.open("dir1/example1.txt");

		fs.write(fd, Buffer.from(text));

		fs.close(fd);

		fs.symlink("/dir1/example1.txt", "symlink1");

		const slFd = fs.open("symlink1");

		const textReadUsingSymlink = fs.read(slFd, 100);

		expect(textReadUsingSymlink).toEqual(text);
	});

	test("Can read data, which has a path, one of which is a symlink", () => {
		fs.mkdir("dir1");

		fs.create("dir1/example1.txt");

		const fd = fs.open("dir1/example1.txt");

		fs.write(fd, Buffer.from(text));

		fs.close(fd);

		fs.symlink("dir1", "symlink");

		const slFd = fs.open("symlink/example1.txt");

		const textReadUsingSymlink = fs.read(slFd, 100);

		expect(textReadUsingSymlink).toEqual(text);
	});
});
