 // Tab functionality
 function openTab(tabId) {
    // Hide all tab contents
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    // Remove active class from all tab buttons
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }
    
    // Show the selected tab content and highlight the button
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-button[onclick="openTab('${tabId}')"]`).classList.add('active');
}

// MFT Implementation
const mftMemorySize = document.getElementById('mft-memory-size');
const mftBlockSize = document.getElementById('mft-block-size');
const mftCreateMemoryBtn = document.getElementById('mft-create-memory');
const mftResetBtn = document.getElementById('mft-reset');
const mftMemoryDisplay = document.getElementById('mft-memory-display');
const mftInitializationInfo = document.getElementById('mft-initialization-info');
const mftProcessControls = document.getElementById('mft-process-controls');
const mftProcessSize = document.getElementById('mft-process-size');
const mftAddProcessBtn = document.getElementById('mft-add-process');
const mftProcessMessage = document.getElementById('mft-process-message');
const mftAllocationInfo = document.getElementById('mft-allocation-info');
const mftAllocationTable = document.getElementById('mft-allocation-tbody');

let mftState = {
    memorySize: 0,
    blockSize: 0,
    numBlocks: 0,
    externalFragmentation: 0,
    totalInternalFragmentation: 0,
    blocks: [], // Array to track which blocks are allocated
    processes: [], // Array to store process details
    processCounter: 0
};

mftCreateMemoryBtn.addEventListener('click', () => {
    const memSize = parseInt(mftMemorySize.value);
    const blockSize = parseInt(mftBlockSize.value);
    
    if (isNaN(memSize) || memSize <= 0 || isNaN(blockSize) || blockSize <= 0) {
        alert('Please enter valid positive numbers for memory and block size.');
        return;
    }
    
    // Initialize MFT
    const numBlocks = Math.floor(memSize / blockSize);
    const externalFrag = memSize - (numBlocks * blockSize);
    
    mftState = {
        memorySize: memSize,
        blockSize: blockSize,
        numBlocks: numBlocks,
        externalFragmentation: externalFrag,
        totalInternalFragmentation: 0,
        blocks: Array(numBlocks).fill(false), // false means the block is free
        processes: [],
        processCounter: 0
    };
    
    // Display memory layout
    displayMFTMemory();
    
    // Update info panel
    document.getElementById('mft-total-memory').textContent = memSize;
    document.getElementById('mft-display-block-size').textContent = blockSize;
    document.getElementById('mft-num-blocks').textContent = numBlocks;
    document.getElementById('mft-external-frag').textContent = externalFrag;
    document.getElementById('mft-total-internal-frag').textContent = '0';
    document.getElementById('mft-final-external-frag').textContent = externalFrag;
    document.getElementById('mft-total-allocated').textContent = '0';
    
    // Show relevant sections
    mftInitializationInfo.style.display = 'block';
    mftProcessControls.style.display = 'block';
    mftAllocationInfo.style.display = 'block';
    
    // Clear allocation table
    mftAllocationTable.innerHTML = '';
    
    mftCreateMemoryBtn.disabled = true;
    mftResetBtn.disabled = false;
    
    // Set process size default to slightly less than block size for demonstration
    mftProcessSize.value = Math.max(Math.floor(blockSize * 0.75), 1);
});

mftResetBtn.addEventListener('click', () => {
    // Reset MFT
    mftMemoryDisplay.innerHTML = '';
    mftInitializationInfo.style.display = 'none';
    mftProcessControls.style.display = 'none';
    mftAllocationInfo.style.display = 'none';
    mftProcessMessage.innerHTML = '';
    
    mftState = {
        memorySize: 0,
        blockSize: 0,
        numBlocks: 0,
        externalFragmentation: 0,
        totalInternalFragmentation: 0,
        blocks: [],
        processes: [],
        processCounter: 0
    };
    
    mftCreateMemoryBtn.disabled = false;
    mftResetBtn.disabled = true;
    mftAddProcessBtn.disabled = false; // Add this line to re-enable the Add Process button
});

mftAddProcessBtn.addEventListener('click', () => {
    const processSize = parseInt(mftProcessSize.value);
    
    if (isNaN(processSize) || processSize <= 0) {
        mftProcessMessage.innerHTML = '<div class="error">Please enter a valid positive number for process size.</div>';
        return;
    }
    
    // Check if any blocks are available
    if (!mftState.blocks.includes(false)) {
        mftProcessMessage.innerHTML = '<div class="error">Memory is full. No more processes can be accommodated.</div>';
        return;
    }
    
    // Find first available block
    const blockIndex = mftState.blocks.indexOf(false);
    
    // Check if process can fit in a block
    if (processSize > mftState.blockSize) {
        // Process is too large for a block
        const process = {
            id: ++mftState.processCounter,
            size: processSize,
            allocated: false,
            blockIndex: -1,
            internalFragmentation: 0
        };
        
        mftState.processes.push(process);
        updateMFTAllocationTable();
        
        mftProcessMessage.innerHTML = '<div class="error">Process is too large for a block and cannot be allocated.</div>';
    } else {
        // Process can fit in a block
        const process = {
            id: ++mftState.processCounter,
            size: processSize,
            allocated: true,
            blockIndex: blockIndex,
            internalFragmentation: mftState.blockSize - processSize
        };
        
        mftState.blocks[blockIndex] = true; // Mark block as allocated
        mftState.processes.push(process);
        mftState.totalInternalFragmentation += process.internalFragmentation;
        
        updateMFTAllocationTable();
        displayMFTMemory();
        
        mftProcessMessage.innerHTML = '<div class="success">Process has been allocated successfully.</div>';
    }
    
    // Calculate total allocated memory
    const totalAllocated = mftState.processes
        .filter(p => p.allocated)
        .reduce((sum, p) => sum + p.size, 0);
    
    document.getElementById('mft-total-internal-frag').textContent = mftState.totalInternalFragmentation;
    document.getElementById('mft-final-external-frag').textContent = mftState.externalFragmentation;
    document.getElementById('mft-total-allocated').textContent = totalAllocated;
    
    // Disable add process button if memory is full
    if (!mftState.blocks.includes(false)) {
        mftAddProcessBtn.disabled = true;
        mftProcessMessage.innerHTML += '<div class="error">Memory is full. No more processes can be accommodated.</div>';
    }
});

function displayMFTMemory() {
    mftMemoryDisplay.innerHTML = '';
    
    const containerHeight = mftMemoryDisplay.clientHeight;
    const minBlockHeight = 60;
    const usableHeight = containerHeight - (mftState.externalFragmentation > 0 ? 30 : 0);
    const rawBlockHeight = usableHeight / mftState.numBlocks;
    const blockHeight = Math.max(rawBlockHeight, minBlockHeight);
    
    // Expand container if needed
    const totalNeeded = blockHeight * mftState.numBlocks + (mftState.externalFragmentation > 0 ? 30 : 0);
    if (totalNeeded > containerHeight) {
        mftMemoryDisplay.style.height = totalNeeded + 'px';
    } else {
        mftMemoryDisplay.style.height = '';
    }
    
    // Create blocks
    for (let i = 0; i < mftState.numBlocks; i++) {
        const block = document.createElement('div');
        block.className = 'memory-block ' + (mftState.blocks[i] ? 'process-block' : 'free-block');
        block.style.height = `${blockHeight}px`;
        block.style.top = `${i * blockHeight}px`;
        
        // Find process in this block if allocated
        if (mftState.blocks[i]) {
            const process = mftState.processes.find(p => p.blockIndex === i);
            if (process) {
                // Create process display
                const processHeight = Math.max((process.size / mftState.blockSize) * blockHeight, 30);
                
                const processBlock = document.createElement('div');
                processBlock.className = 'memory-block process-block';
                processBlock.style.height = `${processHeight}px`;
                processBlock.style.top = `${i * blockHeight}px`;
                processBlock.textContent = `✅ P${process.id}  (${process.size}B  Occupied)`;
                mftMemoryDisplay.appendChild(processBlock);
                
                // Create internal fragmentation display if any
                if (process.internalFragmentation > 0) {
                    const fragHeight = Math.max(blockHeight - processHeight, 30);
                    const fragBlock = document.createElement('div');
                    fragBlock.className = 'memory-block internal-frag';
                    fragBlock.style.height = `${fragHeight}px`;
                    fragBlock.style.top = `${i * blockHeight + processHeight}px`;
                    fragBlock.textContent = `⚠️ Internal Frag — ${process.internalFragmentation}B wasted`;
                    mftMemoryDisplay.appendChild(fragBlock);
                }
            } else {
                block.textContent = `Block ${i+1}`;
                mftMemoryDisplay.appendChild(block);
            }
        } else {
            block.textContent = `🔵 Block ${i+1}  (Free — ${mftState.blockSize}B)`;
            mftMemoryDisplay.appendChild(block);
        }
    }
    
    // Add external fragmentation if any
    if (mftState.externalFragmentation > 0) {
        const externalFragBlock = document.createElement('div');
        externalFragBlock.className = 'memory-block external-frag';
        externalFragBlock.style.height = '30px';
        externalFragBlock.style.top = `${mftState.numBlocks * blockHeight}px`;
        externalFragBlock.textContent = `🔴 External Frag — ${mftState.externalFragmentation}B unusable`;
        mftMemoryDisplay.appendChild(externalFragBlock);
    }
}

function updateMFTAllocationTable() {
    mftAllocationTable.innerHTML = '';
    
    mftState.processes.forEach(process => {
        const row = document.createElement('tr');
        
        const processCell = document.createElement('td');
        processCell.textContent = `Process ${process.id}`;
        
        const sizeCell = document.createElement('td');
        sizeCell.textContent = process.size;
        
        const allocatedCell = document.createElement('td');
        allocatedCell.textContent = process.allocated ? 'YES' : 'NO';
        
        const fragCell = document.createElement('td');
        fragCell.textContent = process.allocated ? process.internalFragmentation : '---';
        
        row.appendChild(processCell);
        row.appendChild(sizeCell);
        row.appendChild(allocatedCell);
        row.appendChild(fragCell);
        
        mftAllocationTable.appendChild(row);
    });
}

// MVT Implementation
const mvtMemorySize = document.getElementById('mvt-memory-size');
const mvtCreateMemoryBtn = document.getElementById('mvt-create-memory');
const mvtResetBtn = document.getElementById('mvt-reset');
const mvtMemoryDisplay = document.getElementById('mvt-memory-display');
const mvtInitializationInfo = document.getElementById('mvt-initialization-info');
const mvtProcessControls = document.getElementById('mvt-process-controls');
const mvtProcessSize = document.getElementById('mvt-process-size');
const mvtAddProcessBtn = document.getElementById('mvt-add-process');
const mvtProcessMessage = document.getElementById('mvt-process-message');
const mvtAllocationInfo = document.getElementById('mvt-allocation-info');
const mvtAllocationTable = document.getElementById('mvt-allocation-tbody');

let mvtState = {
    memorySize: 0,
    availableMemory: 0,
    memoryBlocks: [], // Array of memory blocks (free and allocated)
    processes: [],    // Array to store process details
    processCounter: 0
};

mvtCreateMemoryBtn.addEventListener('click', () => {
    const memSize = parseInt(mvtMemorySize.value);
    
    if (isNaN(memSize) || memSize <= 0) {
        alert('Please enter a valid positive number for memory size.');
        return;
    }
    
    // Initialize MVT
    mvtState = {
        memorySize: memSize,
        availableMemory: memSize,
        memoryBlocks: [{
            start: 0,
            size: memSize,
            type: 'free',
            processId: null
        }],
        processes: [],
        processCounter: 0
    };
    
    // Display memory layout
    displayMVTMemory();
    
    // Update info panel
    document.getElementById('mvt-total-memory').textContent = memSize;
    document.getElementById('mvt-available-memory').textContent = memSize;
    document.getElementById('mvt-total-memory-info').textContent = memSize;
    document.getElementById('mvt-total-allocated').textContent = '0';
    document.getElementById('mvt-external-frag').textContent = '0';
    
    // Show relevant sections
    mvtInitializationInfo.style.display = 'block';
    mvtProcessControls.style.display = 'block';
    mvtAllocationInfo.style.display = 'block';
    
    // Clear allocation table
    mvtAllocationTable.innerHTML = '';
    
    mvtCreateMemoryBtn.disabled = true;
    mvtResetBtn.disabled = false;
    
    // Set process size default to 25% of memory size for demonstration
    mvtProcessSize.value = Math.max(Math.floor(memSize * 0.25), 1);
});

mvtResetBtn.addEventListener('click', () => {
    // Reset MVT
    mvtMemoryDisplay.innerHTML = '';
    mvtInitializationInfo.style.display = 'none';
    mvtProcessControls.style.display = 'none';
    mvtAllocationInfo.style.display = 'none';
    mvtProcessMessage.innerHTML = '';
    
    mvtState = {
        memorySize: 0,
        availableMemory: 0,
        memoryBlocks: [],
        processes: [],
        processCounter: 0
    };
    
    mvtCreateMemoryBtn.disabled = false;
    mvtResetBtn.disabled = true;
    mvtAddProcessBtn.disabled = false; // Add this line to re-enable the Add Process button
});
mvtAddProcessBtn.addEventListener('click', () => {
    const processSize = parseInt(mvtProcessSize.value);
    
    if (isNaN(processSize) || processSize <= 0) {
        mvtProcessMessage.innerHTML = '<div class="error">Please enter a valid positive number for process size.</div>';
        return;
    }
    
    // Find largest single contiguous free block
    let suitableBlockIndex = -1;
    let largestFreeBlock = 0;
    for (let i = 0; i < mvtState.memoryBlocks.length; i++) {
        const block = mvtState.memoryBlocks[i];
        if (block.type === 'free' && block.size >= processSize) {
            suitableBlockIndex = i;
            break;
        }
        if (block.type === 'free' && block.size > largestFreeBlock) {
            largestFreeBlock = block.size;
        }
    }

    // No contiguous block found
    if (suitableBlockIndex === -1) {
        // Check if total free memory would be enough (external fragmentation scenario)
        const totalFree = mvtState.memoryBlocks
            .filter(b => b.type === 'free')
            .reduce((sum, b) => sum + b.size, 0);

        if (totalFree >= processSize) {
            mvtProcessMessage.innerHTML = `<div class="error">
                🔴 <strong>External Fragmentation Detected!</strong><br>
                Total free memory = ${totalFree}B, but the largest contiguous free block is only ${largestFreeBlock}B.<br>
                Cannot fit a process of ${processSize}B — memory is fragmented into small non-contiguous holes.
                <br><em>Solution: Compaction (move all processes together to merge free holes).</em>
            </div>`;
        } else {
            mvtProcessMessage.innerHTML = `<div class="error">Not enough total memory. Need ${processSize}B, only ${totalFree}B free.</div>`;
        }

        // Highlight free blocks as fragmented
        updateExternalFragDisplay();
        return;
    }
    
    // Allocate process into the found block
    const block = mvtState.memoryBlocks[suitableBlockIndex];
    const processId = ++mvtState.processCounter;
    
    mvtState.availableMemory -= processSize;
    
    const process = {
        id: processId,
        size: processSize,
        start: block.start,
        allocated: true 
    };
    
    mvtState.processes.push(process);
    
    if (block.size > processSize) {
        mvtState.memoryBlocks[suitableBlockIndex] = {
            start: block.start,
            size: processSize,
            type: 'process',
            processId: processId
        };
        mvtState.memoryBlocks.splice(suitableBlockIndex + 1, 0, {
            start: block.start + processSize,
            size: block.size - processSize,
            type: 'free',
            processId: null
        });
    } else {
        mvtState.memoryBlocks[suitableBlockIndex].type = 'process';
        mvtState.memoryBlocks[suitableBlockIndex].processId = processId;
    }
    
    displayMVTMemory();
    updateMVTAllocationTable();
    updateMVTStats();
    
    mvtProcessMessage.innerHTML = `<div class="success">✅ Process ${processId} (${processSize}B) allocated successfully.</div>`;
});

// Remove a process by ID — frees its block and merges adjacent free blocks
function removeProcess(processId) {
    const blockIndex = mvtState.memoryBlocks.findIndex(
        b => b.type === 'process' && b.processId === processId
    );
    if (blockIndex === -1) return;

    const block = mvtState.memoryBlocks[blockIndex];
    mvtState.availableMemory += block.size;

    // Free the block
    mvtState.memoryBlocks[blockIndex] = {
        start: block.start,
        size: block.size,
        type: 'free',
        processId: null
    };

    // Merge with next block if also free
    if (blockIndex + 1 < mvtState.memoryBlocks.length &&
        mvtState.memoryBlocks[blockIndex + 1].type === 'free') {
        mvtState.memoryBlocks[blockIndex].size += mvtState.memoryBlocks[blockIndex + 1].size;
        mvtState.memoryBlocks.splice(blockIndex + 1, 1);
    }
    // Merge with previous block if also free
    if (blockIndex - 1 >= 0 &&
        mvtState.memoryBlocks[blockIndex - 1].type === 'free') {
        mvtState.memoryBlocks[blockIndex - 1].size += mvtState.memoryBlocks[blockIndex].size;
        mvtState.memoryBlocks.splice(blockIndex, 1);
    }

    // Remove from processes list
    mvtState.processes = mvtState.processes.filter(p => p.id !== processId);

    displayMVTMemory();
    updateMVTAllocationTable();
    updateMVTStats();
    mvtProcessMessage.innerHTML = `<div class="success">🗑️ Process ${processId} removed. Memory freed and merged.</div>`;
}

function updateExternalFragDisplay() {
    const freeBlocks = mvtState.memoryBlocks.filter(b => b.type === 'free');
    const totalFree = freeBlocks.reduce((s, b) => s + b.size, 0);
    const fragCount = freeBlocks.length;
    document.getElementById('mvt-external-frag').textContent =
        fragCount > 1 ? `${totalFree} (split into ${fragCount} holes ⚠️)` : totalFree;
}

function updateMVTStats() {
    document.getElementById('mvt-available-memory').textContent = mvtState.availableMemory;
    document.getElementById('mvt-total-allocated').textContent = mvtState.memorySize - mvtState.availableMemory;
    updateExternalFragDisplay();
}

function displayMVTMemory() {
    mvtMemoryDisplay.innerHTML = '';
    
    const minBlockHeight = 60;
    const totalHeight = Math.max(
        mvtMemoryDisplay.clientHeight,
        mvtState.memoryBlocks.length * minBlockHeight
    );
    
    if (totalHeight > mvtMemoryDisplay.clientHeight) {
        mvtMemoryDisplay.style.height = totalHeight + 'px';
    } else {
        mvtMemoryDisplay.style.height = '';
    }
    
    // Check if external fragmentation exists (more than 1 free hole)
    const freeHoles = mvtState.memoryBlocks.filter(b => b.type === 'free');
    const hasExtFrag = freeHoles.length > 1;

    mvtState.memoryBlocks.forEach(block => {
        const rawHeight = (block.size / mvtState.memorySize) * totalHeight;
        const blockHeight = Math.max(rawHeight, minBlockHeight);
        const blockTop = (block.start / mvtState.memorySize) * totalHeight;
        
        const blockElement = document.createElement('div');

        if (block.type === 'process') {
            blockElement.className = 'memory-block process-block';
            blockElement.innerHTML = `✅ P${block.processId} &nbsp;(${block.size}B Occupied)
                <button onclick="removeProcess(${block.processId})" style="
                    margin-left:14px; padding:2px 10px; font-size:12px;
                    background:#c0392b; color:#fff; border:none; border-radius:4px;
                    cursor:pointer; font-weight:bold;">✕ Remove</button>`;
        } else {
            // If this is one of multiple free holes, mark it as external frag
            if (hasExtFrag) {
                blockElement.className = 'memory-block external-frag';
                blockElement.textContent = `🔴 Ext. Frag Hole — ${block.size}B (cannot be used alone)`;
            } else {
                blockElement.className = 'memory-block free-block';
                blockElement.textContent = `🔵 Free Memory — ${block.size}B available`;
            }
        }

        blockElement.style.height = `${blockHeight}px`;
        blockElement.style.top = `${blockTop}px`;
        mvtMemoryDisplay.appendChild(blockElement);
    });
}

function updateMVTAllocationTable() {
    mvtAllocationTable.innerHTML = '';
    
    const sortedProcesses = [...mvtState.processes].sort((a, b) => a.id - b.id);
    
    sortedProcesses.forEach(process => {
        const row = document.createElement('tr');
        
        const processCell = document.createElement('td');
        processCell.textContent = `Process ${process.id}`;
        
        const sizeCell = document.createElement('td');
        sizeCell.textContent = process.size;
        
        const allocatedCell = document.createElement('td');
        allocatedCell.textContent = 'YES';
        
        row.appendChild(processCell);
        row.appendChild(sizeCell);
        row.appendChild(allocatedCell);
        
        mvtAllocationTable.appendChild(row);
    });
}
// Initialize the first tab as active
document.addEventListener('DOMContentLoaded', function() {
    openTab('mft-tab');
});

// ── Example auto-fill helpers ──
function applyMFTExample() {
    document.getElementById('mft-memory-size').value = 1050;
    document.getElementById('mft-block-size').value = 200;
    // Reset if already initialized
    if (!mftCreateMemoryBtn.disabled) return;
    mftResetBtn.click();
}

function applyMVTExample() {
    document.getElementById('mvt-memory-size').value = 1000;
    if (!mvtCreateMemoryBtn.disabled) return;
    mvtResetBtn.click();
}