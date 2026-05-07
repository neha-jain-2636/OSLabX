// ── Tab switching ──────────────────────────────────────────────────────────
function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-button[onclick="openTab('${tabId}')"]`).classList.add('active');
}

// ── MFT partition config helpers ───────────────────────────────────────────
// Renders dynamic rows in the custom-partition table
function renderPartitionRows() {
    const tbody = document.getElementById('mft-partition-tbody');
    const rows  = [];
    const count = parseInt(document.getElementById('mft-num-partitions').value) || 0;
    tbody.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const tr  = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = `Partition ${i + 1}`;
        const td2 = document.createElement('td');
        const inp = document.createElement('input');
        inp.type        = 'number';
        inp.min         = '1';
        inp.value       = '200';
        inp.className   = 'partition-size-input';
        inp.id          = `mft-part-size-${i}`;
        inp.style.width = '100px';
        td2.appendChild(inp);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
    }
}

// Reads partition sizes from the dynamic table
function readPartitionSizes() {
    const count = parseInt(document.getElementById('mft-num-partitions').value) || 0;
    const sizes = [];
    for (let i = 0; i < count; i++) {
        const v = parseInt(document.getElementById(`mft-part-size-${i}`).value);
        if (isNaN(v) || v <= 0) return null;
        sizes.push(v);
    }
    return sizes.length ? sizes : null;
}

// ══════════════════════════════════════════════════════════════════════════
//  MFT — Multiprogramming with Fixed Tasks
//  Supports two modes:
//    • Uniform   — one block size, auto-create N equal blocks
//    • Custom    — user defines each partition's size individually
// ══════════════════════════════════════════════════════════════════════════
const mftCreateMemoryBtn    = document.getElementById('mft-create-memory');
const mftResetBtn           = document.getElementById('mft-reset');
const mftMemoryDisplay      = document.getElementById('mft-memory-display');
const mftInitializationInfo = document.getElementById('mft-initialization-info');
const mftProcessControls    = document.getElementById('mft-process-controls');
const mftAddProcessBtn      = document.getElementById('mft-add-process');
const mftProcessMessage     = document.getElementById('mft-process-message');
const mftAllocationInfo     = document.getElementById('mft-allocation-info');
const mftAllocationTable    = document.getElementById('mft-allocation-tbody');

let mftState = {
    memorySize: 0,
    partitionSizes: [],          // array of sizes, one per partition
    externalFragmentation: 0,
    totalInternalFragmentation: 0,
    totalAllocated: 0,
    freeCount: 0,
    allocated: [],               // false = free, true = occupied
    partToProcess: new Map(),    // partitionIndex → process object
    processes: [],
    processCounter: 0
};

// ── Mode toggle ─────────────────────────────────────────────────────────
document.getElementById('mft-mode-uniform').addEventListener('change', function () {
    document.getElementById('mft-uniform-config').style.display = this.checked ? 'block' : 'none';
    document.getElementById('mft-custom-config').style.display  = 'none';
});
document.getElementById('mft-mode-custom').addEventListener('change', function () {
    document.getElementById('mft-uniform-config').style.display = 'none';
    document.getElementById('mft-custom-config').style.display  = this.checked ? 'block' : 'none';
    renderPartitionRows();
});
document.getElementById('mft-num-partitions').addEventListener('input', renderPartitionRows);

// ── Initialize ───────────────────────────────────────────────────────────
mftCreateMemoryBtn.addEventListener('click', () => {
    const isCustom = document.getElementById('mft-mode-custom').checked;
    let partSizes, memSize, externalFrag;

    if (isCustom) {
        partSizes = readPartitionSizes();
        if (!partSizes) {
            alert('Please enter valid positive sizes for all partitions.');
            return;
        }
        memSize      = partSizes.reduce((a, b) => a + b, 0);
        externalFrag = 0; // custom mode: user defines exact sizes, no leftover
    } else {
        memSize   = parseInt(document.getElementById('mft-memory-size').value);
        const blockSize = parseInt(document.getElementById('mft-block-size').value);
        if (isNaN(memSize) || memSize <= 0 || isNaN(blockSize) || blockSize <= 0) {
            alert('Please enter valid positive numbers for memory and block size.');
            return;
        }
        const numBlocks = Math.floor(memSize / blockSize);
        externalFrag    = memSize - numBlocks * blockSize;
        partSizes       = Array(numBlocks).fill(blockSize);
    }

    const numBlocks = partSizes.length;
    mftState = {
        memorySize: memSize,
        partitionSizes: partSizes,
        externalFragmentation: externalFrag,
        totalInternalFragmentation: 0,
        totalAllocated: 0,
        freeCount: numBlocks,
        allocated: Array(numBlocks).fill(false),
        partToProcess: new Map(),
        processes: [], processCounter: 0
    };

    displayMFTMemory();
    _mftRefreshStats();

    document.getElementById('mft-num-blocks').textContent = numBlocks;
    document.getElementById('mft-external-frag').textContent = externalFrag;
    if (!isCustom) {
        document.getElementById('mft-total-memory').textContent       = memSize;
        document.getElementById('mft-display-block-size').textContent =
            document.getElementById('mft-block-size').value;
    } else {
        document.getElementById('mft-total-memory').textContent       = memSize;
        document.getElementById('mft-display-block-size').textContent = 'Varies';
    }

    mftInitializationInfo.style.display = 'block';
    mftProcessControls.style.display    = 'block';
    mftAllocationInfo.style.display     = 'block';
    mftAllocationTable.innerHTML        = '';
    mftProcessMessage.innerHTML         = '';
    mftCreateMemoryBtn.disabled = true;
    mftResetBtn.disabled        = false;
    mftAddProcessBtn.disabled   = false;

    // Suggest a sensible default process size
    const minPart = Math.min(...partSizes);
    document.getElementById('mft-process-size').value = Math.max(Math.floor(minPart * 0.75), 1);

    // Show strategy dropdown only for custom mode (mixed sizes make it meaningful)
    const stratRow = document.getElementById('mft-strategy-row');
    if (stratRow) stratRow.style.display = isCustom ? 'flex' : 'none';
});

mftResetBtn.addEventListener('click', () => {
    mftMemoryDisplay.innerHTML          = '';
    mftInitializationInfo.style.display = 'none';
    mftProcessControls.style.display    = 'none';
    mftAllocationInfo.style.display     = 'none';
    mftProcessMessage.innerHTML         = '';
    mftState = {
        memorySize: 0, partitionSizes: [],
        externalFragmentation: 0, totalInternalFragmentation: 0,
        totalAllocated: 0, freeCount: 0,
        allocated: [], partToProcess: new Map(),
        processes: [], processCounter: 0
    };
    mftCreateMemoryBtn.disabled = false;
    mftResetBtn.disabled        = true;
    mftAddProcessBtn.disabled   = false;
});

mftAddProcessBtn.addEventListener('click', () => {
    const processSize = parseInt(document.getElementById('mft-process-size').value);
    if (isNaN(processSize) || processSize <= 0) {
        mftProcessMessage.innerHTML = '<div class="error">Please enter a valid positive number for process size.</div>';
        return;
    }

    // Strategy: first-fit (default) or best-fit (custom mode only)
    const strategy = (document.getElementById('mft-alloc-strategy') || {}).value || 'first-fit';
    let chosenIndex = -1;

    if (strategy === 'best-fit') {
        // Smallest free partition that still fits the process
        let bestSlack = Infinity;
        for (let i = 0; i < mftState.allocated.length; i++) {
            if (!mftState.allocated[i] && mftState.partitionSizes[i] >= processSize) {
                const slack = mftState.partitionSizes[i] - processSize;
                if (slack < bestSlack) { bestSlack = slack; chosenIndex = i; }
            }
        }
    } else {
        // First-fit: first free partition large enough
        for (let i = 0; i < mftState.allocated.length; i++) {
            if (!mftState.allocated[i] && mftState.partitionSizes[i] >= processSize) {
                chosenIndex = i; break;
            }
        }
    }

    // Check if any free partition exists at all
    const anyFree = mftState.allocated.indexOf(false) !== -1;
    if (!anyFree) {
        mftProcessMessage.innerHTML = '<div class="error">Memory is full. No more processes can be accommodated.</div>';
        return;
    }

    if (chosenIndex === -1) {
        // Partitions exist but none fits — process too large for any free slot
        mftState.processes.push({
            id: ++mftState.processCounter,
            size: processSize, allocated: false,
            partIndex: -1, internalFragmentation: 0
        });
        updateMFTAllocationTable();
        mftProcessMessage.innerHTML = '<div class="error">Process is too large for any free partition and cannot be allocated.</div>';
    } else {
        const partSize     = mftState.partitionSizes[chosenIndex];
        const internalFrag = partSize - processSize;
        const process = {
            id: ++mftState.processCounter,
            size: processSize, allocated: true,
            partIndex: chosenIndex, internalFragmentation: internalFrag
        };
        mftState.allocated[chosenIndex] = true;
        mftState.partToProcess.set(chosenIndex, process);
        mftState.processes.push(process);
        mftState.totalInternalFragmentation += internalFrag;
        mftState.totalAllocated += processSize;
        mftState.freeCount--;

        updateMFTAllocationTable();
        displayMFTMemory();
        mftProcessMessage.innerHTML = `<div class="success">✅ Process ${process.id} allocated to Partition ${chosenIndex + 1} (${strategy}).</div>`;
    }

    _mftRefreshStats();

    if (mftState.freeCount === 0) {
        mftAddProcessBtn.disabled = true;
        mftProcessMessage.innerHTML += '<div class="error">Memory is full.</div>';
    }
});

function _mftRefreshStats() {
    document.getElementById('mft-total-memory').textContent        = mftState.memorySize;
    document.getElementById('mft-total-internal-frag').textContent = mftState.totalInternalFragmentation;
    document.getElementById('mft-final-external-frag').textContent = mftState.externalFragmentation;
    document.getElementById('mft-total-allocated').textContent     = mftState.totalAllocated;
}

// Render MFT memory — handles variable partition sizes
function displayMFTMemory() {
    const frag = document.createDocumentFragment();
    const total = mftState.memorySize || 1;

    for (let i = 0; i < mftState.partitionSizes.length; i++) {
        const pSize = mftState.partitionSizes[i];
        if (mftState.allocated[i]) {
            const process = mftState.partToProcess.get(i);
            if (process) {
                const pct = process.size / total;
                appendBlock(frag, 'process-block', pct,
                    `✅ P${process.id}  (${process.size} B) in Partition ${i + 1} [${pSize} B]`);
                if (process.internalFragmentation > 0) {
                    const fPct = process.internalFragmentation / total;
                    appendBlock(frag, 'internal-frag', fPct,
                        `⚠️ Internal Frag — ${process.internalFragmentation} B wasted`);
                }
            }
        } else {
            const pct = pSize / total;
            appendBlock(frag, 'free-block', pct,
                `🔵 Partition ${i + 1}  (Free — ${pSize} B)`);
        }
    }

    if (mftState.externalFragmentation > 0) {
        appendBlock(frag, 'external-frag', 0,
            `🔴 External Frag — ${mftState.externalFragmentation} B (unusable)`, true);
    }

    mftMemoryDisplay.innerHTML = '';
    mftMemoryDisplay.appendChild(frag);
}

function updateMFTAllocationTable() {
    const frag = document.createDocumentFragment();
    mftState.processes.forEach(p => {
        const row   = document.createElement('tr');
        const pSize = p.partIndex >= 0 ? mftState.partitionSizes[p.partIndex] : '—';
        const cells = [`Process ${p.id}`, p.size, pSize, p.allocated ? 'YES' : 'NO',
                        p.allocated ? p.internalFragmentation : '---'];
        cells.forEach(val => { const td = document.createElement('td'); td.textContent = val; row.appendChild(td); });
        frag.appendChild(row);
    });
    mftAllocationTable.innerHTML = '';
    mftAllocationTable.appendChild(frag);
}

// ══════════════════════════════════════════════════════════════════════════
//  MVT — Multiprogramming with Variable Tasks
// ══════════════════════════════════════════════════════════════════════════
const mvtMemorySize      = document.getElementById('mvt-memory-size');
const mvtCreateMemoryBtn = document.getElementById('mvt-create-memory');
const mvtResetBtn        = document.getElementById('mvt-reset');
const mvtMemoryDisplay   = document.getElementById('mvt-memory-display');
const mvtInitializationInfo = document.getElementById('mvt-initialization-info');
const mvtProcessControls    = document.getElementById('mvt-process-controls');
const mvtProcessSize     = document.getElementById('mvt-process-size');
const mvtAddProcessBtn   = document.getElementById('mvt-add-process');
const mvtProcessMessage  = document.getElementById('mvt-process-message');
const mvtAllocationInfo  = document.getElementById('mvt-allocation-info');
const mvtAllocationTable = document.getElementById('mvt-allocation-tbody');
const mvtCompactBtn      = document.getElementById('mvt-compact');

let mvtState = {
    memorySize: 0, availableMemory: 0,
    memoryBlocks: [],
    processes: [],      // always insertion-ordered by id, FIX 5: no sort needed
    processCounter: 0
};

mvtCreateMemoryBtn.addEventListener('click', () => {
    const memSize = parseInt(mvtMemorySize.value);
    if (isNaN(memSize) || memSize <= 0) {
        alert('Please enter a valid positive number for memory size.');
        return;
    }
    mvtState = {
        memorySize: memSize, availableMemory: memSize,
        memoryBlocks: [{ start: 0, size: memSize, type: 'free', processId: null }],
        processes: [], processCounter: 0
    };

    displayMVTMemory();

    document.getElementById('mvt-total-memory').textContent     = memSize;
    document.getElementById('mvt-available-memory').textContent = memSize;
    document.getElementById('mvt-total-memory-info').textContent= memSize;
    document.getElementById('mvt-total-allocated').textContent  = '0';
    document.getElementById('mvt-external-frag').textContent    = '0';

    mvtInitializationInfo.style.display = 'block';
    mvtProcessControls.style.display    = 'block';
    mvtAllocationInfo.style.display     = 'block';
    mvtAllocationTable.innerHTML        = '';
    mvtProcessMessage.innerHTML         = '';
    mvtCreateMemoryBtn.disabled = true;
    mvtResetBtn.disabled        = false;
    mvtAddProcessBtn.disabled   = false;
    if (mvtCompactBtn) mvtCompactBtn.disabled = false;

    mvtProcessSize.value = Math.max(Math.floor(memSize * 0.25), 1);
});

mvtResetBtn.addEventListener('click', () => {
    mvtMemoryDisplay.innerHTML          = '';
    mvtInitializationInfo.style.display = 'none';
    mvtProcessControls.style.display    = 'none';
    mvtAllocationInfo.style.display     = 'none';
    mvtProcessMessage.innerHTML         = '';
    mvtState = {
        memorySize: 0, availableMemory: 0,
        memoryBlocks: [], processes: [], processCounter: 0
    };
    mvtCreateMemoryBtn.disabled = false;
    mvtResetBtn.disabled        = true;
    mvtAddProcessBtn.disabled   = false;
    if (mvtCompactBtn) mvtCompactBtn.disabled = true;
});

mvtAddProcessBtn.addEventListener('click', () => {
    const processSize = parseInt(mvtProcessSize.value);
    if (isNaN(processSize) || processSize <= 0) {
        mvtProcessMessage.innerHTML = '<div class="error">Please enter a valid positive number for process size.</div>';
        return;
    }

    // FIX 4+6: single pass — find first-fit AND track largest free AND sum totalFree together
    let suitableBlockIndex = -1;
    let largestFreeBlock   = 0;
    let totalFree          = 0;
    for (let i = 0; i < mvtState.memoryBlocks.length; i++) {
        const b = mvtState.memoryBlocks[i];
        if (b.type === 'free') {
            totalFree += b.size;
            if (b.size > largestFreeBlock) largestFreeBlock = b.size;
            if (suitableBlockIndex === -1 && b.size >= processSize) suitableBlockIndex = i;
        }
    }

    if (suitableBlockIndex === -1) {
        mvtProcessMessage.innerHTML = totalFree >= processSize
            ? `<div class="error">
                🔴 <strong>External Fragmentation!</strong><br>
                Total free = ${totalFree} B, but largest contiguous block = ${largestFreeBlock} B.<br>
                Cannot fit ${processSize} B — memory is fragmented into non-contiguous holes.<br>
                <em>Use the <strong>Compact Memory</strong> button below to merge all free holes.</em>
               </div>`
            : `<div class="error">Not enough memory. Need ${processSize} B, only ${totalFree} B free.</div>`;
        updateMVTStats();
        return;
    }

    const block     = mvtState.memoryBlocks[suitableBlockIndex];
    const processId = ++mvtState.processCounter;
    mvtState.availableMemory -= processSize;

    mvtState.processes.push({ id: processId, size: processSize, start: block.start, allocated: true });

    if (block.size > processSize) {
        mvtState.memoryBlocks[suitableBlockIndex] = {
            start: block.start, size: processSize, type: 'process', processId
        };
        mvtState.memoryBlocks.splice(suitableBlockIndex + 1, 0, {
            start: block.start + processSize,
            size:  block.size - processSize,
            type: 'free', processId: null
        });
    } else {
        mvtState.memoryBlocks[suitableBlockIndex].type      = 'process';
        mvtState.memoryBlocks[suitableBlockIndex].processId = processId;
    }

    displayMVTMemory();
    updateMVTAllocationTable();
    updateMVTStats();
    mvtProcessMessage.innerHTML = `<div class="success">✅ Process ${processId} (${processSize} B) allocated.</div>`;
});

// ── Compaction ────────────────────────────────────────────────────────────
// Merges all free holes into a single contiguous block at the end.
// Processes are shifted down (conceptually relocated) to pack them together.
if (mvtCompactBtn) {
    mvtCompactBtn.addEventListener('click', () => {
        const freeHoles = mvtState.memoryBlocks.filter(b => b.type === 'free');

        if (freeHoles.length === 0) {
            mvtProcessMessage.innerHTML = '<div class="error">Memory is completely full — nothing to compact.</div>';
            return;
        }
        if (freeHoles.length === 1) {
            const hole = freeHoles[0];
            mvtProcessMessage.innerHTML = `<div class="success">✅ Already compact — free memory is one contiguous ${hole.size} B block. No compaction needed.</div>`;
            return;
        }

        const totalFree = freeHoles.reduce((sum, b) => sum + b.size, 0);
        const processes = mvtState.memoryBlocks.filter(b => b.type === 'process');

        // Repack: place all processes contiguously from address 0
        let cursor = 0;
        const newBlocks = processes.map(p => {
            const block = { start: cursor, size: p.size, type: 'process', processId: p.processId };
            cursor += p.size;
            return block;
        });

        // Update process start addresses in state.processes
        mvtState.processes.forEach(p => {
            const b = newBlocks.find(nb => nb.processId === p.id);
            if (b) p.start = b.start;
        });

        // Single merged free hole at the end
        if (totalFree > 0) {
            newBlocks.push({ start: cursor, size: totalFree, type: 'free', processId: null });
        }

        mvtState.memoryBlocks  = newBlocks;
        mvtState.availableMemory = totalFree;

        displayMVTMemory();
        updateMVTAllocationTable();
        updateMVTStats();
        mvtProcessMessage.innerHTML =
            `<div class="success">🗜️ Compaction done! ${freeHoles.length} holes (scattered) → 1 contiguous free block of ${totalFree} B.</div>`;
    });
}

// Remove process — free block and merge adjacent free blocks
function removeProcess(processId) {
    const idx = mvtState.memoryBlocks.findIndex(b => b.type === 'process' && b.processId === processId);
    if (idx === -1) return;

    const block = mvtState.memoryBlocks[idx];
    mvtState.availableMemory += block.size;
    mvtState.memoryBlocks[idx] = { start: block.start, size: block.size, type: 'free', processId: null };

    // Merge next, then previous
    if (idx + 1 < mvtState.memoryBlocks.length && mvtState.memoryBlocks[idx + 1].type === 'free') {
        mvtState.memoryBlocks[idx].size += mvtState.memoryBlocks[idx + 1].size;
        mvtState.memoryBlocks.splice(idx + 1, 1);
    }
    if (idx - 1 >= 0 && mvtState.memoryBlocks[idx - 1].type === 'free') {
        mvtState.memoryBlocks[idx - 1].size += mvtState.memoryBlocks[idx].size;
        mvtState.memoryBlocks.splice(idx, 1);
    }

    mvtState.processes = mvtState.processes.filter(p => p.id !== processId);

    displayMVTMemory();
    updateMVTAllocationTable();
    updateMVTStats();
    mvtProcessMessage.innerHTML = `<div class="success">🗑️ Process ${processId} removed. Memory freed and merged.</div>`;
}

// FIX 4+6: single pass computes freeHoleCount, totalFree, and updates all stats
function updateMVTStats() {
    let freeHoleCount = 0;
    let totalFree     = 0;
    for (const b of mvtState.memoryBlocks) {
        if (b.type === 'free') { freeHoleCount++; totalFree += b.size; }
    }
    document.getElementById('mvt-available-memory').textContent = mvtState.availableMemory;
    document.getElementById('mvt-total-allocated').textContent  = mvtState.memorySize - mvtState.availableMemory;
    document.getElementById('mvt-external-frag').textContent    =
        freeHoleCount > 1 ? `${totalFree} (${freeHoleCount} holes ⚠️)` : totalFree;
}

// Render MVT — FIX 6: single pass for freeHoleCount + FIX 7: DocumentFragment batch
function displayMVTMemory() {
    // Single pass: count free holes first to decide block style
    let freeHoleCount = 0;
    for (const b of mvtState.memoryBlocks) { if (b.type === 'free') freeHoleCount++; }
    const hasExtFrag = freeHoleCount > 1;

    // Enable compact button only when there is actual fragmentation to fix
    if (mvtCompactBtn) mvtCompactBtn.disabled = (mvtState.memorySize === 0);

    const frag = document.createDocumentFragment(); // FIX 7

    mvtState.memoryBlocks.forEach(block => {
        const pct = block.size / mvtState.memorySize;
        if (block.type === 'process') {
            const el = appendBlock(frag, 'process-block', pct,
                `✅ P${block.processId}  (${block.size} B occupied)`);
            const btn = document.createElement('button');
            btn.className   = 'remove-btn';
            btn.textContent = '✕ Remove';
            btn.onclick     = () => removeProcess(block.processId);
            el.appendChild(btn);
        } else {
            const cls  = hasExtFrag ? 'external-frag' : 'free-block';
            const text = hasExtFrag
                ? `🔴 Ext. Frag Hole — ${block.size} B (cannot be used alone)`
                : `🔵 Free Memory — ${block.size} B`;
            appendBlock(frag, cls, pct, text);
        }
    });

    mvtMemoryDisplay.innerHTML = ''; // FIX 7: single clear + one bulk insert
    mvtMemoryDisplay.appendChild(frag);
}

// FIX 5: processes are already insertion-ordered — no .sort() needed
function updateMVTAllocationTable() {
    const frag = document.createDocumentFragment(); // FIX 7
    mvtState.processes.forEach(p => {
        const row = document.createElement('tr');
        [`Process ${p.id}`, p.size, 'YES'].forEach(val => {
            const td = document.createElement('td');
            td.textContent = val;
            row.appendChild(td);
        });
        frag.appendChild(row);
    });
    mvtAllocationTable.innerHTML = '';
    mvtAllocationTable.appendChild(frag);
}

// ══════════════════════════════════════════════════════════════════════════
//  Shared helper — build a proportional flex block into a fragment/container
// ══════════════════════════════════════════════════════════════════════════
function appendBlock(container, className, sizeFraction, text, fixed = false) {
    const el = document.createElement('div');
    el.className = `memory-block ${className}`;
    if (fixed) {
        el.style.flex      = '0 0 42px';
        el.style.minHeight = '42px';
    } else {
        const grow = Math.max(sizeFraction * 100, 8);
        el.style.flex      = `${grow} 0 56px`;
        el.style.minHeight = '56px';
    }
    el.textContent = text;
    container.appendChild(el);
    return el;
}

// ── Example auto-fill ──────────────────────────────────────────────────────
function applyMFTExample() {
    // Switch to uniform mode
    document.getElementById('mft-mode-uniform').checked = true;
    document.getElementById('mft-uniform-config').style.display = 'block';
    document.getElementById('mft-custom-config').style.display  = 'none';
    document.getElementById('mft-memory-size').value = 1050;
    document.getElementById('mft-block-size').value  = 200;
    if (mftCreateMemoryBtn.disabled) mftResetBtn.click();
}
function applyMVTExample() {
    document.getElementById('mvt-memory-size').value = 1000;
    if (mvtCreateMemoryBtn.disabled) mvtResetBtn.click();
}

document.addEventListener('DOMContentLoaded', () => openTab('mft-tab'));