import { FileSystem } from "../modules/FileSystem.js";

import { beforeAll, describe, expect, test } from "@jest/globals";

/**
 * @type {FileSystem}
 */
let fs;

beforeAll(() => {
	fs = new FileSystem();
	console.log("Setting up the test environment...");
});

describe("file operations with truncate", () => {
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

	test("writes to a file", () => {
		const text = "Hello world, this is my first ever file!";
		fs.write(fd, Buffer.from(text));
		const read = String(fs.read(fd, 100));
		expect(read).toEqual(text);
	});

	test("truncates file to 10 bytes", () => {
		fs.truncate("example.txt", 10);
		const stats = fs.stat("example.txt");
		expect(stats).toContain("Size: 10");
	});

	test("truncates file to 50 bytes", () => {
		fs.truncate("example.txt", 50);
		const stats = fs.stat("example.txt");
		expect(stats).toContain("Size: 50");
	});
});
