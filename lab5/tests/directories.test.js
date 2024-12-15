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

describe("basic directory operations", () => {
	test("creates a directory", () => {
		fs.mkdir("dir1");

		expect(fs.currentDirectory.directoryEntries.get("dir1")).toBeDefined();
	});

	test("cd to a new directory", () => {
		fs.mkdir("dir2");
		fs.cd("dir1");

		expect(fs.currentDirectory.name).toEqual("dir1");
	});

	test("creates a 2 level directory", () => {
		fs.mkdir("dir3");

		fs.cd("dir3");

		expect(fs.currentDirectory.name).toEqual("dir3");
	});

	test("cd to a parent directory twice", () => {
		fs.cd("../..");

		expect(fs.currentDirectory.name).toEqual("/");
	});

	test("cd to a current directory", () => {
		fs.cd(".");

		expect(fs.currentDirectory.name).toEqual("/");
	});

	test("delete an empty dir", () => {
		fs.ls();
		fs.rmdir("dir2");
		expect(fs.currentDirectory.directoryEntries.get("dir2")).toBeUndefined();
	});

	test("try to delete non empty directory get an error", () => {
		expect(() => fs.rmdir("dir1")).toThrowError();
	});
});
