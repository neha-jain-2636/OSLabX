/* ============================================================
   script.js — Contiguous Memory Allocation
   Implements: Best-Fit, Next-Fit, Worst-Fit algorithms
   ============================================================ */

let nextFitPointer = 0;

function showError(message) {
  const el = document.getElementById('error-msg');
  el.textContent = message;
  el.classList.remove('hidden');
}

function clearError() {
  const el = document.getElementById('error-msg');
  el.textContent = '';
  el.classList.add('hidden');
}

function renderOutput(html) {
  document.getElementById('visual-output').innerHTML = html;
}

/**
 * Best-Fit Algorithm
 * Finds the SMALLEST free block that fits the process
 */
function bestFit(memory, processSize) {
  let bestBlockIndex = -1;
  let bestBlockSize = Infinity;

  for (let i = 0; i < memory.length; i++) {
    if (memory[i].type === 'free' && memory[i].size >= processSize) {
      if (memory[i].size < bestBlockSize) {
        bestBlockSize = memory[i].size;
        bestBlockIndex = i;
      }
    }
  }
  return bestBlockIndex;
}

/**
 * Next-Fit Algorithm
 * Continues search from where the last allocation ended
 */
function nextFit(memory, processSize) {
  for (let i = 0; i < memory.length; i++) {
    const idx = (nextFitPointer + i) % memory.length;
    if (memory[idx].type === 'free' && memory[idx].size >= processSize) {
      nextFitPointer = (idx + 1) % memory.length;
      return idx;
    }
  }
  return -1;
}

/**
 * Worst-Fit Algorithm (NEW)
 * Finds the LARGEST free block available
 */
function worstFit(memory, processSize) {
  let worstBlockIndex = -1;
  let worstBlockSize = -1;

  for (let i = 0; i < memory.length; i++) {
    if (memory[i].type === 'free' && memory[i].size >= processSize) {
      if (memory[i].size > worstBlockSize) {
        worstBlockSize = memory[i].size;
        worstBlockIndex = i;
      }
    }
  }
  return worstBlockIndex;
}

function simulateAllocation(totalMemory, blockSizes, strategy, processes) {
  let currentAddress = 0;
  const memory = blockSizes.map(size => {
    const block = {
      type: 'free',
      size: size,
      name: 'Free',
      startAddress: currentAddress,
    };
    currentAddress += size;
    return block;
  });

  const allocations = [];
  const allocationDetails = [];

  nextFitPointer = 0;

  for (const proc of processes) {
    const [name, size] = proc.split(':');
    const processSize = parseInt(size);

    if (isNaN(processSize) || processSize <= 0) {
      allocationDetails.push({
        process: name,
        size: processSize,
        status: 'Invalid size',
        address: '-',
        allocation: 'FAILED',
        blockUsed: '-'
      });
      continue;
    }

    let blockIndex = -1;
    switch (strategy) {
      case 'best-fit':
        blockIndex = bestFit(memory, processSize);
        break;
      case 'next-fit':
        blockIndex = nextFit(memory, processSize);
        break;
      case 'worst-fit':
        blockIndex = worstFit(memory, processSize);
        break;
    }

    if (blockIndex === -1) {
      allocationDetails.push({
        process: name,
        size: processSize,
        status: 'No suitable block',
        address: '-',
        allocation: 'FAILED',
        blockUsed: '-'
      });
    } else {
      const block = memory[blockIndex];
      const startAddress = block.startAddress;
      const blockSizeUsed = block.size;

      allocationDetails.push({
        process: name,
        size: processSize,
        status: `Remaining: ${blockSizeUsed - processSize} KB`,
        address: startAddress,
        allocation: 'SUCCESS',
        blockUsed: blockSizeUsed
      });

      allocations.push({
        name,
        size: processSize,
        startAddress,
      });

      if (block.size === processSize) {
        memory[blockIndex] = {
          type: 'allocated',
          size: processSize,
          name,
          startAddress,
        };
      } else {
        memory[blockIndex] = {
          type: 'allocated',
          size: processSize,
          name,
          startAddress,
        };

        memory.splice(blockIndex + 1, 0, {
          type: 'free',
          size: block.size - processSize,
          name: 'Free',
          startAddress: startAddress + processSize,
        });
      }
    }
  }

  const totalAllocated = allocations.reduce((sum, a) => sum + a.size, 0);
  const totalFree = memory.reduce((sum, m) => m.type === 'free' ? sum + m.size : sum, 0);
  const freeBlocks = memory.filter(m => m.type === 'free').length;
  const internalFragmentation = totalFree > 0 ? (freeBlocks > 0 ? totalFree / freeBlocks : 0) : 0;
  const fragmentationPercentage = (totalFree / totalMemory) * 100;

  return {
    memory,
    allocations,
    allocationDetails,
    stats: {
      totalAllocated,
      totalFree,
      utilizationRate: ((totalAllocated / totalMemory) * 100).toFixed(2),
      fragmentationPercentage: fragmentationPercentage.toFixed(2),
      freeBlocks,
      avgBlockSize: freeBlocks > 0 ? (totalFree / freeBlocks).toFixed(2) : 0,
      internalFragmentation: internalFragmentation.toFixed(2),
    }
  };
}

function renderMemoryVisualization(memory, totalMemory) {
  const segments = memory.map(block => {
    const percentage = (block.size / totalMemory) * 100;
    const cls = block.type === 'free' ? 'free' : 'allocated';
    return `
      <div class="memory-segment ${cls}" style="flex: ${percentage}; min-width: ${Math.max(percentage, 2)}%;">
        <span class="memory-segment-label">${block.name}</span>
        <span class="memory-segment-tooltip">${block.name} (${block.size} KB)</span>
      </div>
    `;
  }).join('');

  return `
    <div class="memory-block-row">
      <div class="memory-label">Memory Layout After Allocation</div>
      <div class="memory-visual">
        ${segments}
      </div>
      <div class="memory-legend">
        <div class="legend-item">
          <div class="legend-color allocated"></div>
          <span>Allocated</span>
        </div>
        <div class="legend-item">
          <div class="legend-color free"></div>
          <span>Free</span>
        </div>
      </div>
    </div>
  `;
}

function renderStats(stats) {
  return `
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-value">${stats.utilizationRate}%</div>
        <div class="stat-label">Memory Used</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${stats.totalFree} KB</div>
        <div class="stat-label">Free Memory</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${stats.freeBlocks}</div>
        <div class="stat-label">Free Blocks</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${stats.avgBlockSize}</div>
        <div class="stat-label">Avg Block Size</div>
      </div>
    </div>
  `;
}

function renderFragmentation(stats) {
  const fragPercent = parseFloat(stats.fragmentationPercentage);
  return `
    <div class="fragmentation-meter">
      <div class="fragmentation-label">Memory Fragmentation: ${stats.fragmentationPercentage}%</div>
      <div class="fragmentation-bar">
        <div class="fragmentation-fill" style="width: ${Math.min(fragPercent, 100)}%;"></div>
      </div>
    </div>
  `;
}

function renderAllocationTable(details) {
  const rows = details.map(d => {
    const statusClass = d.allocation === 'SUCCESS' ? 'status-success' : 'status-failed';
    return `
      <tr>
        <td><strong>${d.process}</strong></td>
        <td>${d.size} KB</td>
        <td>${d.blockUsed}</td>
        <td>${d.address}</td>
        <td>${d.status}</td>
        <td><span class="${statusClass}">${d.allocation}</span></td>
      </tr>
    `;
  }).join('');

  return `
    <div style="margin-top: 20px;">
      <h3>Allocation Details</h3>
      <table class="results-table">
        <thead>
          <tr>
            <th>Process</th>
            <th>Size</th>
            <th>Block Size Used</th>
            <th>Start Address</th>
            <th>Block Info</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderAlgorithmInfo(strategy) {
  const descriptions = {
    'best-fit': {
      title: 'Best-Fit Algorithm',
      description: 'Searches through all free blocks and allocates the SMALLEST block that fits the process. Minimizes wasted space per allocation but can lead to fragmentation with many small unusable blocks.'
    },
    'next-fit': {
      title: 'Next-Fit Algorithm',
      description: 'Continues searching from where the last allocation ended (wraps around to the beginning if needed). Distributes allocations throughout memory and reduces search time.'
    },
    'worst-fit': {
      title: 'Worst-Fit Algorithm (NEW)',
      description: 'Searches through all free blocks and allocates the LARGEST block that fits the process. Preserves smaller blocks but uses more memory per allocation.'
    }
  };

  const info = descriptions[strategy] || descriptions['best-fit'];
  return `
    <div class="algorithm-info">
      <h4>${info.title}</h4>
      <p>${info.description}</p>
    </div>
  `;
}

function runSimulation() {
  clearError();

  const totalMemoryStr = document.getElementById('totalMemory').value.trim();
  const blocksStr = document.getElementById('blocks').value.trim();
  const strategy = document.getElementById('strategy').value;
  const processesStr = document.getElementById('processes').value.trim();

  if (!totalMemoryStr || isNaN(totalMemoryStr) || parseInt(totalMemoryStr) <= 0) {
    showError('⚠️ Please enter a valid total memory size (must be > 0).');
    return;
  }

  if (!blocksStr) {
    showError('⚠️ Please enter memory block sizes (e.g., 300 200 150 350).');
    return;
  }

  const totalMemory = parseInt(totalMemoryStr);
  const blockSizes = blocksStr.split(/\s+/).map(Number);

  let totalBlockMemory = 0;
  for (const blockSize of blockSizes) {
    if (isNaN(blockSize) || blockSize <= 0) {
      showError('⚠️ All block sizes must be positive numbers.');
      return;
    }
    totalBlockMemory += blockSize;
  }

  if (totalBlockMemory !== totalMemory) {
    showError(`⚠️ Sum of blocks (${totalBlockMemory} KB) must equal total memory (${totalMemory} KB).`);
    return;
  }

  if (!processesStr) {
    showError('⚠️ Please enter process allocation requests (e.g., P1:300 P2:200).');
    return;
  }

  const processes = processesStr.split(/\s+/);

  for (const proc of processes) {
    if (!proc.includes(':')) {
      showError(`⚠️ Invalid format: "${proc}". Use "name:size" format (e.g., P1:300).`);
      return;
    }
    const [name, size] = proc.split(':');
    if (!name || !size || isNaN(size)) {
      showError(`⚠️ Invalid process: "${proc}". Name and size must be specified.`);
      return;
    }
    if (parseInt(size) > totalMemory) {
      showError(`⚠️ Process ${name} size (${size} KB) exceeds total memory (${totalMemory} KB).`);
      return;
    }
  }

  const result = simulateAllocation(totalMemory, blockSizes, strategy, processes);

  const outputHTML = `
    <h3 style="margin-bottom:16px;">Simulation Results</h3>
    ${renderAlgorithmInfo(strategy)}
    ${renderMemoryVisualization(result.memory, totalMemory)}
    ${renderStats(result.stats)}
    ${renderFragmentation(result.stats)}
    ${renderAllocationTable(result.allocationDetails)}
    <p class="text-muted mt-16" style="font-size:0.82rem;">
      💡 Tip: Change the strategy and blocks to see how different algorithms handle fragmentation!
    </p>
  `;

  renderOutput(outputHTML);
}

function resetAll() {
  document.getElementById('totalMemory').value = '1000';
  document.getElementById('blocks').value = '300 200 150 350';
  document.getElementById('strategy').value = 'best-fit';
  document.getElementById('processes').value = 'P1:250 P2:150 P3:200 P4:100';

  clearError();
  nextFitPointer = 0;
  renderOutput(`
    <div class="output-placeholder">
      <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 17v-2m3 2v-4m3 4v-6M3 21h18M3 10l9-7 9 7" />
      </svg>
      <p>Results will appear here after you run the simulation.</p>
    </div>
  `);
}