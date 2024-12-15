import { FileSystem } from "../modules/FileSystem.js";

const fs = new FileSystem();

fs.create("example1.txt");
fs.create("example2.txt");
fs.create("example3.txt");
fs.create("example4.txt");
fs.create("example5.txt");

fs.ls();
