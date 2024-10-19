import { Kernel } from './Kernel';
import { MMU } from './MMU';
import { Process } from './Process';

// Configuration constants
const MIN_PROCESS_REQUESTS = 1200;
const MAX_PROCESS_REQUESTS = 1800;
const MIN_PAGE_TABLE_SIZE = 20;
const MAX_PAGE_TABLE_SIZE = 30;
const MIN_MEMORY_REQUESTS = 30;
const MAX_MEMORY_REQUESTS = 50;
const WORKING_SET_REGENERATION_PROBABILITY = 5; // in percent
const NEW_PROCESS_CREATION_PROBABILITY = 20; // in percent
const TOTAL_PHYSICAL_PAGES = 100;
const INITIAL_PROCESS_COUNT = 3;
const MAX_RUNNING_PROCESSES = 10;
const PAGE_STAT_UPDATE_INTERVAL = 15; // number of pages to update per cycle

// Initialize system components
const kernel = new Kernel(TOTAL_PHYSICAL_PAGES);
const mmu = new MMU(kernel.handlePageFault.bind(kernel));
const processQueue: Process[] = [];

// Main entry point
function main() {
  initializeProcesses(INITIAL_PROCESS_COUNT);
  setInterval(manageProcesses, 1000); // Runs the process management every second
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
    process.accessMemoryPages(MIN_MEMORY_REQUESTS, MAX_MEMORY_REQUESTS, mmu);

    // If the process is completed, free its resources
    if (process.isComplete) {
      kernel.freeProcessResources(process);
      processQueue.splice(i, 1); // Remove completed process from the queue
    }
  }

  // Decide whether to create a new process
  if (shouldCreateNewProcess()) createNewProcess();

  // Update page statistics in the kernel
  kernel.updatePageStatistics(PAGE_STAT_UPDATE_INTERVAL);

  // Print the current page fault statistics
  printPageFaultStatistics();
}

// Create a new process and add it to the queue
function createNewProcess() {
  const process = new Process(MIN_PAGE_TABLE_SIZE, MAX_PAGE_TABLE_SIZE, MIN_PROCESS_REQUESTS, MAX_PROCESS_REQUESTS);
  processQueue.push(process);
}

// Print the page fault statistics
function printPageFaultStatistics() {
  const pageFaultPercentage = (kernel.totalPageFaults / mmu.totalPageAccesses);
  console.log(`Page fault rate: ${pageFaultPercentage.toFixed(2)}%`);
}

// Check if it's time to regenerate the working set for a process
function shouldRegenerateWorkingSet(): boolean {
  return Math.random() * 100 < WORKING_SET_REGENERATION_PROBABILITY;
}

// Check if it's time to create a new process
function shouldCreateNewProcess(): boolean {
  return processQueue.length < MAX_RUNNING_PROCESSES && Math.random() * 100 < NEW_PROCESS_CREATION_PROBABILITY;
}

// Start the main program loop
main();

