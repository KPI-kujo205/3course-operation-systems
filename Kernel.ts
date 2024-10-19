import { PageTableEntry } from "./PageTableEntry";
import { Process } from "./Process";

export class PhysicalPage {
  pageTable: PageTableEntry[] | null = null; // Reference to the page table that owns this page
  pageIndex: number = 0; // Index within the page table
  physicalPageNumber!: number; // Physical page number in memory
}

export class Kernel {
  freePhysicalPages: PhysicalPage[] = []; // List of free physical pages
  occupiedPhysicalPages: PhysicalPage[] = []; // List of occupied physical pages
  totalPageFaults: number = 0; // Total number of page faults
  private clockHandIndex: number = 0;
  private lastUpdatedPageIndex: number = 0;

  constructor(physicalPageCount: number) {
    for (let i = 0; i < physicalPageCount; i++) {
      const physicalPage = new PhysicalPage();
      physicalPage.physicalPageNumber = i;
      this.freePhysicalPages.push(physicalPage);
    }
  }

  handlePageFault(pageTable: PageTableEntry[], pageIndex: number) {
    this.totalPageFaults++;

    let physicalPage: PhysicalPage;

    if (this.freePhysicalPages.length > 0) {
      physicalPage = this.allocateFreePage();
    } else {
      physicalPage = this.runClockAlgorithm();

      if (!physicalPage.pageTable) throw new Error("Error: Physical page has no associated page table");

      physicalPage.pageTable[physicalPage.pageIndex].presenceBit = false;
    }

    physicalPage.pageTable = pageTable;
    physicalPage.pageIndex = pageIndex;
    pageTable[pageIndex].presenceBit = true;
    pageTable[pageIndex].pageNumber = physicalPage.physicalPageNumber;
  }

  private allocateFreePage(): PhysicalPage {
    const freePage = this.freePhysicalPages.shift()!;
    this.occupiedPhysicalPages.push(freePage);
    return freePage;
  }

  freeProcessResources(process: Process) {
    process.pageTable.forEach((pageTableEntry) => {
      if (!pageTableEntry.presenceBit) return;

      pageTableEntry.presenceBit = false;
      const physicalPage = this.occupiedPhysicalPages.find(pp => pp.physicalPageNumber === pageTableEntry.pageNumber)!;

      // Remove from occupied list and move back to free list
      this.occupiedPhysicalPages = this.occupiedPhysicalPages.filter(pp => pp !== physicalPage);
      this.freePhysicalPages.push(physicalPage);
    });
  }

  updatePageStatistics(pagesToUpdate: number) {
    if (this.occupiedPhysicalPages.length === 0) return;

    for (let i = 0; i < pagesToUpdate; i++) {
      if (this.lastUpdatedPageIndex >= this.occupiedPhysicalPages.length) {
        this.lastUpdatedPageIndex = 0;
      }

      const physicalPage = this.occupiedPhysicalPages[this.lastUpdatedPageIndex];

      if (!physicalPage.pageTable) throw new Error("Error: Physical page has no associated page table");

      physicalPage.pageTable[physicalPage.pageIndex].referenceBit = false;

      console.log(`Updating page statistics for page at index ${physicalPage.pageIndex}`);

      this.lastUpdatedPageIndex++;
    }
  }

  // This algotitm helps to find a physical page which can be used to swap
  private runClockAlgorithm(): PhysicalPage {
    let candidatePage: PhysicalPage;
    const MAX_WRITE_ATTEMPTS = 5;
    let writeAttempts = 0;
    let pageFound = false;

    while (!pageFound) {
      candidatePage = this.occupiedPhysicalPages[this.clockHandIndex];

      if (!candidatePage.pageTable) throw new Error("Error: Physical page has no associated page table");

      const pageEntry = candidatePage.pageTable[candidatePage.pageIndex];

      if (!pageEntry.referenceBit) {
        // Page without reference is found lets check if it is dirty
        if (pageEntry.modifiedBit && writeAttempts < MAX_WRITE_ATTEMPTS) {
          // If it is dirty we move to the next page 

          pageEntry.modifiedBit = false;
          writeAttempts++;
        } else {
          // esle the free page is found
          pageFound = true;
        }
      } else {
        // Clear the reference bit and move the clock hand forward
        pageEntry.referenceBit = false;
      }

      this.clockHandIndex = (this.clockHandIndex + 1) % this.occupiedPhysicalPages.length;
    }

    console.log(`Page replacement (Clock algorithm): Physical page found ${candidatePage!.physicalPageNumber}`);
    return candidatePage!;
  }
}

