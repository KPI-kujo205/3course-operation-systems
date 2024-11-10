import { PageTableEntry } from "./PageTableEntry.ts";
import { MMU } from "./MMU.ts";
import { config } from "./config.ts";

export class Process {
  static processesCount = 0;


  pageTable: PageTableEntry[];

  private processNumber: number;
  private workingSet: number[];
  private requestCount: number = 0;
  private readonly requestLimit: number;

  constructor(
    minTableSize: number,
    maxTableSize: number,
    minProcessRequests: number,
    maxProcessRequests: number
  ) {
    // Initialize page table with random size within the given limits
    const pageTableSize = Math.floor(Math.random() * (maxTableSize - minTableSize + 1) + minTableSize);
    this.pageTable = Array.from({ length: pageTableSize }, () => new PageTableEntry());

    // Generate initial working set
    this.workingSet = this.generateNewWorkingSet();

    // Set the process request limit
    this.requestLimit = Math.floor(Math.random() * (maxProcessRequests - minProcessRequests + 1) + minProcessRequests);

    this.processNumber = ++Process.processesCount;
  }

  get isComplete(): boolean {
    return this.requestCount >= this.requestLimit;
  }

  accessMemoryPages(minMemoryRequests: number, maxMemoryRequests: number, mmu: MMU) {
    const memoryRequests = Math.floor(Math.random() * (maxMemoryRequests - minMemoryRequests + 1) + minMemoryRequests);

    for (let i = 0; i < memoryRequests; i++) {
      let pageIndex: number;
      let isWrite = false;

      // 90% chance to access a page from the working set
      if (Math.random() < 0.9) {
        pageIndex = this.workingSet[Math.floor(Math.random() * this.workingSet.length)];
      } else {
        // Otherwise, access a random page
        pageIndex = Math.floor(Math.random() * this.pageTable.length);
      }

      // 30% chance to perform a write operation
      if (Math.random() < 0.3) isWrite = true;

      // Access the page via MMU
      mmu.accessPage(this.pageTable, pageIndex, isWrite, this.processNumber);

      this.requestCount++;

      if (!config.DISABLE_LOGGING) {
        console.log(`Process ${this.requestCount}/${this.requestLimit}, page index ${pageIndex}, read/write ${isWrite}`);
      }

    }
  }

  generateNewWorkingSet(): number[] {
    const workingSetSize = Math.floor(this.pageTable.length * 0.3);
    const workingSet = new Set<number>();

    // Generate a working set with a size of 30% of the page table
    while (workingSet.size < workingSetSize) {
      workingSet.add(Math.floor(Math.random() * this.pageTable.length));
    }

    return Array.from(workingSet);
  }
}

