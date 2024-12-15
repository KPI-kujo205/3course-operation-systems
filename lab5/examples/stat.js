import { FileSystem } from "../modules/FileSystem.js";

const fs = new FileSystem();
fs.create("example.txt");
fs.stat("example.txt");
