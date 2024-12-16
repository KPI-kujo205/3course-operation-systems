import { FileSystem } from "../modules/FileSystem.js";

const fs = new FileSystem();

const text = "012345678910";

fs.mkdir("dir1");

fs.create("dir1/example1.txt");

const fd = fs.open("dir1/example1.txt");

fs.write(fd, Buffer.from(text));

fs.close(fd);

fs.symlink("dir1", "symlink");

const slFd = fs.open("symlink/example1.txt");

const textReadUsingSymlink = fs.read(slFd, 100);

console.log(textReadUsingSymlink);
