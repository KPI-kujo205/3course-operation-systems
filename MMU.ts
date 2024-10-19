import { PageTableEntry } from "./PageTableEntry";

export class MMU {
  totalPageAccesses: number = 0;

  constructor(private handlePageFault: (pageTable: PageTableEntry[], pageIndex: number) => void) { }

  accessPage(pageTable: PageTableEntry[], pageIndex: number, isWrite: boolean) {
    this.totalPageAccesses++;

    // Handle page fault if page is not present
    if (!pageTable[pageIndex].presenceBit) {
      this.handlePageFault(pageTable, pageIndex);
    }

    // Mark the page as referenced
    pageTable[pageIndex].referenceBit = true;

    // Mark the page as modified if it's a write operation
    if (isWrite) {
      pageTable[pageIndex].modifiedBit = true;
    }
  }
}

