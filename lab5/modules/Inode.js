import {Utils} from "./Utils.js";

export const InodeType = {
  FILE: 'f',
  DIRECTORY: 'd',
  SYMLINK: 's',
};

export class Inode {
  /**
   * size of the file in bytes
   * @type {number}
   */
  _size = 0;
  
  /**
   * @type {ArrayBuffer[]}
   */
  directLinks = [];
  
  /**
   * @type {number[]}
   */
  directLinkIndeces = [];
  
  /**
   * @type {number}
   */
  inodeNumber;
  
  /**
   * @param {'f'|'d'} type  - direct and indirect block links, stored in RAM
   * @param {ArrayBuffer[]} blocks  - direct and indirect block links, stored in RAM
   * @param {number} _inodeNumber  - number of the inode
   * @param {number[]} directLinkIndeces  - number of the inode
   */
  constructor(type, blocks, _inodeNumber, directLinkIndeces) {
    this.type = type; // 'f' for file, 'd' for directory
    this.directLinks = blocks;
    this.linkCount = 0;
    this.inodeNumber = _inodeNumber;
    this.directLinkIndeces = directLinkIndeces;
    this.createdAt = Date.now();
    this.modifiedAt = Date.now();
    this._size = 0;
  }
  
  get actualSize() {
    return Utils.readArrayBuffers(this.directLinks).byteLength;
  }
  
  get size() {
    return Math.max(this.actualSize, this._size);
  }
}
