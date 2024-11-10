import { PageTableEntry } from "./PageTableEntry.ts";
import { config } from "./config.ts";
import { Process } from "./Process.ts";

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
  private tau: number; // Working set time window in milliseconds
  private pageAccessTimes: Map<number, number> = new Map(); // Maps physical page number to last access time

  constructor(physicalPageCount: number, tauInMs: number) {
    for (let i = 0; i < physicalPageCount; i++) {
      const physicalPage = new PhysicalPage();
      physicalPage.physicalPageNumber = i;
      this.freePhysicalPages.push(physicalPage);
    }
    this.tau = tauInMs;
  }

  private updateCurrentTime() {
    this.currentTime++ ;
  }

  handlePageFault(pageTable: PageTableEntry[], pageIndex: number) {
    this.totalPageFaults++;


    let physicalPage: PhysicalPage;

    if (this.freePhysicalPages.length > 0) {
      physicalPage = this.allocateFreePage();
    } else {
      if (config.USING_RANDOM_ALGORITHM) {
        physicalPage = this.randomAlgorithm()
      } else {
        physicalPage = this.runWSClockAlgorithm()
      }

      if (!physicalPage.pageTable) throw new Error("Error: Physical page has no associated page table");

      physicalPage.pageTable[physicalPage.pageIndex].presenceBit = false;
    }

    physicalPage.pageTable = pageTable;
    physicalPage.pageIndex = pageIndex;

    pageTable[pageIndex].presenceBit = true;
    pageTable[pageIndex].pageNumber = physicalPage.physicalPageNumber;

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
    this.updateCurrentTime();

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

      if (!config.DISABLE_LOGGING) {
        console.log(`Updating page statistics for page at index ${physicalPage.pageIndex}`);
      }

      this.lastUpdatedPageIndex++;
    }
  }

  private randomAlgorithm(): PhysicalPage {
    const rnd = Math.floor(Math.random() * this.occupiedPhysicalPages.length);
    const physPage = this.occupiedPhysicalPages[rnd];

    console.log(`Page replacement (Random): ${physPage.physicalPageNumber}`);

    return physPage;
  }

  private runWSClockAlgorithm(): PhysicalPage {
    this.updateCurrentTime();
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
      } else {
        if (this.currentTime - lastAccessTime > this.tau) {
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
      }

      this.clockHandIndex = (this.clockHandIndex + 1) % this.occupiedPhysicalPages.length;
    } while (this.clockHandIndex !== startIndex);

    if (!candidatePage && oldestPage) {
      console.log('oldestPage page');
      candidatePage = oldestPage;
    }

    if (!candidatePage) {
      candidatePage = this.occupiedPhysicalPages[this.clockHandIndex];
      console.log('even not oldestPage');
    }

    if (candidatePage.pageTable) {
      const selectedPageEntry = candidatePage.pageTable[candidatePage.pageIndex];
      if (selectedPageEntry.modifiedBit) {
        if (!config.DISABLE_LOGGING) {
          console.log(`Scheduling write to disk for page ${candidatePage.physicalPageNumber}`);
        }
        // In a real system, this is where we'd schedule the page to be written to disk
        // For this simulation, we'll just reset the modified bit
        selectedPageEntry.modifiedBit = false;
      }
    }

    if (!config.DISABLE_LOGGING)
      console.log(`Page replacement (WSClock algorithm): Physical page found ${candidatePage.physicalPageNumber}`);

    return candidatePage;
  }
}


