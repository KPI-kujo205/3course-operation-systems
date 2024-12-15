import { FileSystem } from "../modules/FileSystem.js";
import { FSConfig } from "../modules/fsConfig.js";

import { beforeAll, describe, expect, test } from "@jest/globals";

/**
 * @type {FileSystem}
 */
let fs;

beforeAll(() => {
	fs = new FileSystem();
	console.log("Setting up the test environment...");
});

describe("fs is being created", () => {
	test("creates an fs", () => {
		expect(new FileSystem()).toHaveProperty(
			"inodes.length",
			FSConfig.MAX_INODES,
		);
	});
});

describe("file operations in 1 directory", () => {
	let fd;

	test("creates a file", () => {
		fs.create("example.txt");

		expect(
			fs.currentDirectory.directoryEntries.get("example.txt"),
		).toBeDefined();
	});

	test("opens a file with a file descriptor", () => {
		fd = fs.open("example.txt");

		expect(fd).toEqual(0);
	});

	test("writes and reads to a file and from file", () => {
		const text = "Hello world, this is my first ever file!";
		fs.write(fd, Buffer.from(text));
		const read = String(fs.read(fd, 100));

		expect(read).toEqual(text);
	});
});
describe("file operations in many directories", () => {
	test("creates a dir and file in it and switches to '/'", () => {
		fs.mkdir("dir1");

		fs.cd("dir1");

		fs.create("example.txt");

		fs.cd("/");

		expect(
			fs.currentDirectory.directoryEntries.get("example.txt"),
		).toBeDefined();
	});

	test("opens a file with a file descriptor", () => {
		const fd = fs.open("dir1/example.txt");

		expect(fd).toBeDefined();
	});

	test("writes and reads to a file and from file", () => {
		const fd = fs.open("dir1/example.txt");

		const text = "Hello world, this is my first ever file!";
		fs.write(fd, Buffer.from(text));
		const read = String(fs.read(fd, 100));

		expect(read).toEqual(text);
	});

	test("deletes a file with an absolute path", () => {
		fs.cd("dir1");
		fs.rm("example.txt");

		expect(fs.currentDirectory.directoryEntries.has("example.txt")).toEqual(
			false,
		);
	});
});
describe("file operations in many directories", () => {
	test("creates a dir and file in it and switches to '/'", () => {
		fs.mkdir("dir1");

		fs.cd("dir1");

		fs.create("example.txt");

		fs.cd("/");

		expect(
			fs.currentDirectory.directoryEntries.get("example.txt"),
		).toBeDefined();
	});
});
