import { FileSystem } from "../modules/FileSystem.js";

// Usage example
const fs = new FileSystem();

fs.create("example1.txt");

const fd = fs.open("example1.txt");

fs.write(fd, Buffer.from("Hello world, this is my first ever file!"));

console.log("contents of fd1:\n", fs.read(fd, 100));

fs.create("example2.txt");

fs.link("example1.txt", "example2.txt");

const fd2 = fs.open("example2.txt");

console.log("contents of fd2:\n", fs.read(fd2, 100));

fs.close(fd2);

fs.unlink("example2.txt");

const fd2_ = fs.open("example2.txt");
