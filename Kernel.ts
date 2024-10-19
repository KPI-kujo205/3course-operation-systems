import { PageTableEntry } from "./PageTableEntry";
import { Process } from "./Process";

export class PhysicalPage {
  pageTable: PageTableEntry[] | null = null;
  pageIndex: number = 0;
  physicalPageNumber!: number;
}

export class Kernel {
  freePhysicalPages: PhysicalPage[] = [];
  occupiedPhysicalPages: PhysicalPage[] = [];
  totalPageFaults: number = 0;
  private clockHandIndex: number = 0;
  private lastUpdatedPageIndex: number = 0;
  private currentTime: number = 0;
  private tau: number; // Working set time window
  private pageAccessTimes: Map<number, number> = new Map(); // Maps physical page number to last access time

  constructor(physicalPageCount: number, tau: number) {
    for (let i = 0; i < physicalPageCount; i++) {
      const physicalPage = new PhysicalPage();
      physicalPage.physicalPageNumber = i;
      this.freePhysicalPages.push(physicalPage);
    }
    this.tau = tau;
  }

  handlePageFault(pageTable: PageTableEntry[], pageIndex: number) {
    this.totalPageFaults++;
    this.currentTime++;

    let physicalPage: PhysicalPage;

    if (this.freePhysicalPages.length > 0) {
      physicalPage = this.allocateFreePage();
    } else {
      physicalPage = this.runWSClockAlgorithm();

      if (!physicalPage.pageTable) throw new Error("Error: Physical page has no associated page table");

      physicalPage.pageTable[physicalPage.pageIndex].presenceBit = false;
    }

    physicalPage.pageTable = pageTable;
    physicalPage.pageIndex = pageIndex;
    pageTable[pageIndex].presenceBit = true;
    pageTable[pageIndex].pageNumber = physicalPage.physicalPageNumber;
    pageTable[pageIndex].referenceBit = true;
    pageTable[pageIndex].modifiedBit = false;
    this.pageAccessTimes.set(physicalPage.physicalPageNumber, this.currentTime);
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

      this.occupiedPhysicalPages = this.occupiedPhysicalPages.filter(pp => pp !== physicalPage);
      this.freePhysicalPages.push(physicalPage);
      this.pageAccessTimes.delete(physicalPage.physicalPageNumber);
    });
  }

  updatePageStatistics(pagesToUpdate: number) {
    if (this.occupiedPhysicalPages.length === 0) return;
    this.currentTime++;

    for (let i = 0; i < pagesToUpdate; i++) {
      if (this.lastUpdatedPageIndex >= this.occupiedPhysicalPages.length) {
        this.lastUpdatedPageIndex = 0;
      }

      const physicalPage = this.occupiedPhysicalPages[this.lastUpdatedPageIndex];

      if (!physicalPage.pageTable) throw new Error("Error: Physical page has no associated page table");

      const pageEntry = physicalPage.pageTable[physicalPage.pageIndex];

      if (pageEntry.referenceBit) {
        pageEntry.referenceBit = false;
        this.pageAccessTimes.set(physicalPage.physicalPageNumber, this.currentTime);
      }

      console.log(`Updating page statistics for page at index ${physicalPage.pageIndex}`);

      this.lastUpdatedPageIndex++;
    }
  }

  private runWSClockAlgorithm(): PhysicalPage {
    let candidatePage: PhysicalPage | null = null;
    let oldestPage: PhysicalPage | null = null;
    let oldestTime = Infinity;

    const startIndex = this.clockHandIndex;

    do {
      const currentPage = this.occupiedPhysicalPages[this.clockHandIndex];

      if (!currentPage.pageTable) throw new Error("Error: Physical page has no associated page table");

      const pageEntry = currentPage.pageTable[currentPage.pageIndex];
      const lastAccessTime = this.pageAccessTimes.get(currentPage.physicalPageNumber) || 0;

      if (pageEntry.referenceBit) {
        pageEntry.referenceBit = false;
        this.pageAccessTimes.set(currentPage.physicalPageNumber, this.currentTime);
      } else if (this.currentTime - lastAccessTime > this.tau) {
        if (!pageEntry.modifiedBit) {
          candidatePage = currentPage;
          break;
        } else {
          if (lastAccessTime < oldestTime) {
            oldestPage = currentPage;
            oldestTime = lastAccessTime;
          }
        }
      }

      this.clockHandIndex = (this.clockHandIndex + 1) % this.occupiedPhysicalPages.length;
    } while (this.clockHandIndex !== startIndex);

    if (!candidatePage && oldestPage) {
      candidatePage = oldestPage;
    }

    if (!candidatePage) {
      candidatePage = this.occupiedPhysicalPages[this.clockHandIndex];
    }

    if (candidatePage.pageTable) {
      const selectedPageEntry = candidatePage.pageTable[candidatePage.pageIndex];
      if (selectedPageEntry.modifiedBit) {
        console.log(`Scheduling write to disk for page ${candidatePage.physicalPageNumber}`);
        // In a real system, this is where we'd schedule the page to be written to disk
        // For this simulation, we'll just reset the modified bit
        selectedPageEntry.modifiedBit = false;
      }
    }

    console.log(`Page replacement (WSClock algorithm): Physical page found ${candidatePage.physicalPageNumber}`);
    return candidatePage;
  }
}
