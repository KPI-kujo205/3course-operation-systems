import {FileSystem} from "../modules/FileSystem.js";

// Usage example
const fs = new FileSystem();

fs.create("example.txt");
fs.create("example1.txt");
fs.create("example3.txt");

fs.ls()

fs.mkdir('test_dir')

fs.ls()

fs.cd('test_dir')

fs.ls()


fs.create("test_dir_example.txt");
fs.create("test_dir_example1.txt");
fs.create("test_dir_example2.txt");
fs.create("test_dir_example3.txt");


fs.ls()


fs.cd('..')

fs.ls()
