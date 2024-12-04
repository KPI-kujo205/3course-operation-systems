import { FileSystem } from "../modules/FileSystem.js";

// Usage example
const fs = new FileSystem();

fs.create("example.txt");

const fd = fs.open("example.txt");

fs.write(fd, Buffer.from("Hello world, this is my first ever file!"));

fs.seek(fd, 0);

console.log("contents of fd1:\n", fs.read(fd, 100));

fs.seek(fd, 10);

console.log("contents of fd1 after seek 10:\n", fs.read(fd, 100));
