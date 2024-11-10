

export class PageTableEntry {
  presenceBit: boolean = false; // Indicates if the page is present in memory
  referenceBit: boolean = false; // Indicates if the page has been referenced
  modifiedBit: boolean = false; // Indicates if the page has been modified
  pageNumber: number = 0; // Maps to the physical page number
}


