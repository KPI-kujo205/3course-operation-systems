import { FileSystem } from "../modules/FileSystem.js";

// Usage example
const fs = new FileSystem();

fs.create("example.txt");

const fd = fs.open("example.txt");

fs.write(fd, Buffer.from("Hello world, this is my first ever file!"));

fs.stat("example.txt");

fs.truncate("example.txt", 10);

fs.stat("example.txt");

fs.truncate("example.txt", 50);

fs.stat("example.txt");
