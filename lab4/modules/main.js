import { FileSystem } from "./FileSystem.js";

// Usage example
const fs = new FileSystem(); // 1024 inodes, 8192 blocks

fs.create("example.txt");

const fd = fs.open("example.txt");

fs.write(fd, Buffer.from("Hello world, this is my first ever file!!!"));

fs.seek(fd, 0);

console.log("contents of fd1:\n", fs.read(fd, 100));

fs.seek(fd, 10);

console.log("contents of fd1:\n", fs.read(fd, 100));

fs.close(fd);

fs.stat("example.txt");

fs.ls();

// fs.link("example.txt", "example_link.txt");
// fs.ls();
//
// fs.unlink("example.txt");
// fs.ls();
//
// fs.truncate("example_link.txt", 5);
// fs.stat("example_link.txt");
