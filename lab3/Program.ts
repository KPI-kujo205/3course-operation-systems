import { Kernel } from './Kernel.ts';
import { MMU } from './MMU.ts';
import { Process } from './Process.ts';
import { config } from './config.ts';

// Initialize system components
const kernel = new Kernel(config.TOTAL_PHYSICAL_PAGES, config.WS_CLOCK_TAU_MS);
const mmu = new MMU(kernel.handlePageFault.bind(kernel));
const processQueue: Process[] = [];

let minPageFault = Infinity
let maxPageFault = 0
let intervalsAmount = 0
let faultRateSum = 0

// Main entry point
function main() {
  initializeProcesses(config.INITIAL_PROCESS_COUNT);
  setInterval(manageProcesses, config.INTERVAL_MS); // Runs the process management every second
}

// Initialize the initial processes
function initializeProcesses(count: number) {
  for (let i = 0; i < count; i++) {
    createNewProcess();
  }
}

// Main loop that manages processes
function manageProcesses() {
  // Iterate over all running processes
  for (let i = 0; i < processQueue.length; ++i) {
    const process = processQueue[i];

    // Regenerate working set if needed
    if (shouldRegenerateWorkingSet()) process.generateNewWorkingSet();

    // Access memory pages through the MMU
    process.accessMemoryPages(config.MIN_MEMORY_REQUESTS, config.MAX_MEMORY_REQUESTS, mmu);

    // If the process is completed, free its resources
    if (process.isComplete) {
      kernel.freeProcessResources(process);
      processQueue.splice(i, 1); // Remove completed process from the queue
    }
  }

  // Decide whether to create a new process
  if (shouldCreateNewProcess()) createNewProcess();

  // Update page statistics in the kernel
  kernel.updatePageStatistics(config.PAGE_STAT_UPDATE_INTERVAL);

  // Print the current page fault statistics
  printPageFaultStatistics();
}

// Create a new process and add it to the queue
function createNewProcess() {
  const process = new Process(config.MIN_PAGE_TABLE_SIZE, config.MAX_PAGE_TABLE_SIZE, config.MIN_PROCESS_REQUESTS, config.MAX_PROCESS_REQUESTS);
  processQueue.push(process);
}

// Print the page fault statistics
function printPageFaultStatistics() {

  const pageFaultPercentage = (kernel.totalPageFaults / mmu.totalPageAccesses) * 100;
  if (pageFaultPercentage > maxPageFault) {
    maxPageFault = pageFaultPercentage;
  }
  if (pageFaultPercentage<minPageFault){
    minPageFault= pageFaultPercentage;
  }
  faultRateSum += pageFaultPercentage;
  intervalsAmount++;

  console.log(`Page fault rate (interval N${intervalsAmount}): ${pageFaultPercentage.toFixed(2)}%`);
  console.log(`Min/Max page fault stats: ${minPageFault}% / ${maxPageFault}%`);
  console.log(`Average page fault: ${faultRateSum/intervalsAmount}%`);
}



// Check if it's time to regenerate the working set for a process
function shouldRegenerateWorkingSet(): boolean {
  return Math.random() * 100 < config.WORKING_SET_REGENERATION_PROBABILITY;
}

// Check if it's time to create a new process
function shouldCreateNewProcess(): boolean {
  return processQueue.length < config.MAX_RUNNING_PROCESSES && Math.random() * 100 < config.NEW_PROCESS_CREATION_PROBABILITY;
}

// Start the main program loop
main();

