import { FileSystem } from "../modules/FileSystem.js";

// Usage example
const fs = new FileSystem();

fs.create("example.txt");

const fd = fs.open("example.txt");

fs.write(fd, Buffer.from("Hello world, this is my first ever file!"));

fs.create("example2.txt");

fs.link("example.txt", "example2.txt");

const fd2 = fs.open("example2.txt");

console.log("contents of fd2:\n", fs.read(fd2, 100));
