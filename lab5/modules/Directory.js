import {Utils} from "./Utils.js";
import {FSConfig} from "./fsConfig.js";

export class Directory {
  /**
   * @type string
   */
  name;
  
  /**
   * @type Inode
   */
  inode;
  
  /**
   * Can be null if its root directory
   * @type {number | null}
   */
  parentInodeNumber;
  
  /**
   * @type {Map<string, number>}
   */
  directoryEntries = new Map();
  
  /**
   * @param {Inode} inode - directory inode
   * @param {string | undefined | null} [name] - name of a directory (will be @deprecated)
   * @param {number | undefined | null} [parentInodeNumber] - name of a directory (will be @deprecated)
   * */
  constructor(inode, name, parentInodeNumber) {
    this.inode = inode;
    this.name = name;
    this.parentInodeNumber = parentInodeNumber;
    
    try {
      const dataUnderInode = this.read();
      
      if (!dataUnderInode) {
        this.directoryEntries = new Map();
        this.createDirectoryEntry(".", this.inode.inodeNumber);
        
        if (typeof parentInodeNumber === 'number') {
          this.createDirectoryEntry("..", this.parentInodeNumber);
        }
        
        return
      }
      
      this.directoryEntries = new Map(dataUnderInode.directoryEntries)
      this.parentInodeNumber = dataUnderInode.parentInodeNumber
      this.name = dataUnderInode.name
      
    } catch (e) {
      console.error(e?.message)
    }
  }
  
  /**
   * Reads data from an array of direct links
   * @returns {Directory}
   * */
  read() {
    const links = this.inode.directLinks;
    
    const textDecoder = new TextDecoder();
    
    const result = Utils.readArrayBuffers(links);
    
    const decodedStr = textDecoder.decode(result);
    
    if (!decodedStr) {
      return null;
    }
    
    return JSON.parse(decodedStr);
  }
  
  /**
   * Creates directory entry and points it to an inode
   * @param {string} name
   * @param inode {number}
   */
  createDirectoryEntry(name, inode) {
    if (this.directoryEntries.has(name)) {
      throw new Error("File already exists");
    }
    
    this.directoryEntries.set(name, inode);
    this.save();
  }
  
  /**
   * Saves directory entries to inode direct links
   */
  save() {
    const objectToSave = JSON.parse(JSON.stringify(this));
    objectToSave.directoryEntries = Array.from(this.directoryEntries.entries());
    
    const jsonString = JSON.stringify(objectToSave);
    
    const encodedData = new TextEncoder().encode(jsonString);
    const chunkSize = FSConfig.BLOCK_SIZE;
    
    if (encodedData.length > chunkSize * this.inode.directLinks.length) {
      throw new Error("Data size exceeds maximum limit");
    }
    
    for (let i = 0; i < encodedData.length; i += chunkSize) {
      const chunk = encodedData.slice(i, i + chunkSize);
      const buffer = new ArrayBuffer(chunkSize);
      const view = new Uint8Array(buffer);
      view.set(chunk);
      this.inode.directLinks[Math.floor(i / chunkSize)] = buffer;
    }
  }
  
  /**
   * Find an entry by name
   * @param {string} name
   * @returns {number | undefined} Returns `undefined` if not inode found
   */
  findInodeNumberByName(name) {
    return this.directoryEntries.get(name);
  }
}
