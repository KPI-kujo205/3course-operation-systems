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

fs.seek(fd, 10);

fs.write(fd, Buffer.from("LOOOOOOOL"));

fs.seek(fd, 0);

console.log("contents of fd1:\n", fs.read(fd, 100));

fs.stat("example.txt");

fs.ls();

fs.truncate("example.txt", 5);

console.log("contents of fd1:\n", fs.read(fd, 100));

// fs.link("example.txt", "example_link.txt");
// fs.ls();
//
// fs.unlink("example.txt");
// fs.ls();
//
// fs.truncate("example_link.txt", 5);
// fs.stat("example_link.txt");

// • link name1 name2 – створити жорстке посилання з ім’ям name2 на файл, на який вказує
// жорстке посилання з ім’ям name1.
// • unlink name – знищити жорстке посилання з ім’ям name.
//
// • truncate name size – змінити розмір файлу, на який вказує жорстке посилання з ім’ям
// name. Якщо розмір файлу збільшується, тоді неініціалізовані дані дорівнюють нулям.
