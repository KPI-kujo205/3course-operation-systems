import { FileSystem } from "./FileSystem.js";

// Usage example
const fs = new FileSystem(); // 1024 inodes, 8192 blocks

fs.create("example.txt");
fs.create("example1.txt");
fs.create("example2.txt");
fs.create("example3.txt");

const fd = fs.open("example.txt");

fs.write(fd, Buffer.from("Hello, World!"));
fs.seek(fd, 0);
const data = fs.read(fd, 10);
console.log("contents of fd 1 ", data);
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
