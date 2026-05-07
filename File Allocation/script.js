/* ============================================================
   script.js — Module 02: File Allocation Strategies
   Multi-file allocation on a shared disk. Supports deallocation.
   Algorithms: Sequential, Indexed, Linked, Extended Indexed (Bonus)
   ============================================================ */

/* ── Disk State ──────────────────────────────────────────────── */
let TOTAL_BLOCKS = 0;
let BLOCK_SIZE   = 0;
let diskInitialized = false;

// occupiedBy[i] = fileId string if block i is taken, else null
let occupiedBy   = [];

// files = { [fileId]: { name, algo, size, blocks[], indexBlocks[], color } }
let files = {};

let currentAlgo = 'sequential';
let fileCounter = 0; // auto-increment for unique IDs

// Palette of colors for files (cycles)
const FILE_COLORS = [
  '#4f6ef7','#22c55e','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#ec4899','#10b981','#f97316','#6366f1',
];
let colorIdx = 0;

const ALGO_HINTS = {
  sequential: 'Finds the first contiguous free region. Simple but can cause external fragmentation.',
  indexed:    'Picks a free index block first, then fills free data blocks. Supports direct access.',
  linked:     'Scatters data across free blocks linked by pointers. No fragmentation, sequential access only.',
};

/* ── Helpers ─────────────────────────────────────────────────── */
function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('success-msg').classList.add('hidden');
}
function showSuccess(msg) {
  const el = document.getElementById('success-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('error-msg').classList.add('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}
function clearMessages() {
  document.getElementById('error-msg').classList.add('hidden');
  document.getElementById('success-msg').classList.add('hidden');
}

function freeBlocks() {
  return occupiedBy.filter(v => v === null).length;
}
function blocksNeeded(fileSize) {
  return Math.ceil(fileSize / BLOCK_SIZE);
}

/* ── Disk Initialization ─────────────────────────────────────── */
function applyDiskConfig() {
  const t = parseInt(document.getElementById('cfg-total').value);
  const b = parseInt(document.getElementById('cfg-blocksize').value);
  if (isNaN(t) || t < 4)  return alert('Total blocks must be at least 4.');
  if (isNaN(b) || b < 1)  return alert('Block size must be at least 1 byte.');

  TOTAL_BLOCKS    = t;
  BLOCK_SIZE      = b;
  occupiedBy      = Array(TOTAL_BLOCKS).fill(null);
  files           = {};
  fileCounter     = 0;
  colorIdx        = 0;
  diskInitialized = true;

  // Lock config
  document.getElementById('cfg-total').disabled     = true;
  document.getElementById('cfg-blocksize').disabled = true;
  document.getElementById('cfg-btn').textContent    = 'Disk Initialized (Reset to change)';
  document.getElementById('cfg-btn').disabled       = true;

  document.getElementById('disk-visual-card').style.display = '';
  document.getElementById('alloc-card').style.display       = '';

  renderDiskGrid();
  renderFAT();
}

/* ── Algorithm Tab Switch ────────────────────────────────────── */
function switchAlgo(algo, btn) {
  currentAlgo = algo;
  document.querySelectorAll('.algo-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('algo-desc').textContent = ALGO_HINTS[algo];
  clearMessages();
}

/* ── Disk Grid Renderer ──────────────────────────────────────── */
function renderDiskGrid() {
  const grid = document.getElementById('disk-grid');
  grid.innerHTML = '';

  for (let i = 0; i < TOTAL_BLOCKS; i++) {
    const fid  = occupiedBy[i];
    const div  = document.createElement('div');
    div.className = 'disk-block';
    div.id = 'blk-' + i;

    // Number badge
    const numSpan = document.createElement('span');
    numSpan.className = 'block-num';
    numSpan.textContent = i;
    div.appendChild(numSpan);

    if (fid === null) {
      div.classList.add('free');
      const lbl = document.createElement('span');
      lbl.className = 'block-label';
      lbl.textContent = '–';
      div.appendChild(lbl);
    } else {
      const f   = files[fid];
      const isIdx = f.indexBlocks && f.indexBlocks.includes(i);
      div.classList.add(isIdx ? 'idx-block' : 'data-block');
      div.style.background    = f.color;
      div.style.borderColor   = f.color;

      const lbl = document.createElement('span');
      lbl.className = 'block-label';
      lbl.textContent = f.name;
      div.appendChild(lbl);

      div.title = `File: ${f.name} | Block ${i}${isIdx ? ' (Index Block)' : ''}`;
    }

    grid.appendChild(div);
  }

  // Stats
  const used = TOTAL_BLOCKS - freeBlocks();
  document.getElementById('disk-stats-row').innerHTML = `
    <div class="stat-box"><div class="stat-value">${TOTAL_BLOCKS}</div><div class="stat-label">Total</div></div>
    <div class="stat-box"><div class="stat-value" style="color:var(--success)">${freeBlocks()}</div><div class="stat-label">Free</div></div>
    <div class="stat-box"><div class="stat-value" style="color:var(--error)">${used}</div><div class="stat-label">Used</div></div>
    <div class="stat-box"><div class="stat-value">${Object.keys(files).length}</div><div class="stat-label">Files</div></div>
    <div class="stat-box"><div class="stat-value">${BLOCK_SIZE}B</div><div class="stat-label">Block Size</div></div>
  `;

  // Legend
  const legend = document.getElementById('disk-legend');
  legend.innerHTML = `<div class="legend-item"><div class="legend-dot free"></div><span>Free</span></div>`;
  Object.values(files).forEach(f => {
    legend.innerHTML += `
      <div class="legend-item">
        <div class="legend-dot" style="background:${f.color};border-color:${f.color};"></div>
        <span>${f.name}</span>
      </div>`;
  });
}

/* ── FAT Renderer ────────────────────────────────────────────── */
function renderFAT() {
  const output = document.getElementById('visual-output');
  const fids   = Object.keys(files);

  if (fids.length === 0) {
    output.innerHTML = `
      <div class="output-placeholder">
        <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        <p>No files allocated yet. Use the form above to allocate your first file.</p>
      </div>`;
    return;
  }

  // Build FAT rows
  let rows = '';
  fids.forEach(fid => {
    const f = files[fid];
    const algoLabel = { sequential:'Sequential', indexed:'Indexed', linked:'Linked', extindexed:'Ext. Indexed ⭐' }[f.algo];

    // Build the "location" cell content per algorithm
    let locationCell = '';
    if (f.algo === 'sequential') {
      locationCell = `Start: <strong>${f.blocks[0]}</strong>, Length: <strong>${f.blocks.length}</strong>`;
    } else if (f.algo === 'indexed') {
      locationCell = `Index Block: <strong>${f.indexBlocks[0]}</strong> → [${f.blocks.join(', ')}]`;
    } else if (f.algo === 'linked') {
      locationCell = `Head: <strong>${f.blocks[0]}</strong> → ... → <strong>${f.blocks[f.blocks.length-1]}</strong> → NULL`;
    } else if (f.algo === 'extindexed') {
      locationCell = `IDX1: <strong>${f.indexBlocks[0]}</strong>, IDX2: <strong>${f.indexBlocks[1]}</strong> → [${f.blocks.join(', ')}]`;
    }

    rows += `
      <tr class="fat-file-row" id="fat-row-${fid}">
        <td>
          <span class="file-color-swatch" style="background:${f.color};"></span>
          <strong>${f.name}</strong>
        </td>
        <td><span class="badge badge-info">${algoLabel}</span></td>
        <td>${f.size} B</td>
        <td>${f.blocks.length + (f.indexBlocks ? f.indexBlocks.length : 0)}</td>
        <td style="font-family:var(--font-mono);font-size:0.82rem;">${locationCell}</td>
        <td>
          <button class="detail-toggle" onclick="toggleDetail('${fid}', this)">▼ Details</button>
        </td>
        <td>
          <button class="btn-dealloc" onclick="deallocateFile('${fid}')">✕ Free</button>
        </td>
      </tr>
      <tr>
        <td colspan="7" style="padding:0 8px 8px;">
          <div class="file-detail" id="detail-${fid}">
            ${buildFileDetail(f)}
          </div>
        </td>
      </tr>`;
  });

  output.innerHTML = `
    <h3 style="margin-bottom:14px;">File Allocation Table (FAT)</h3>
    <div style="overflow-x:auto;">
      <table class="output-table">
        <thead>
          <tr>
            <th>File Name</th>
            <th>Algorithm</th>
            <th>File Size</th>
            <th>Blocks Used</th>
            <th>Location / Structure</th>
            <th></th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ── Per-file Detail Panel ───────────────────────────────────── */
function buildFileDetail(f) {
  if (f.algo === 'sequential') {
    const blockList = f.blocks.map((b, i) => [i+1, b, i===0?'Start (FCB)':'Contiguous']).map(r =>
      `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
    return `
      <strong>FCB Entry:</strong> Start=${f.blocks[0]}, Length=${f.blocks.length}, End=${f.blocks[f.blocks.length-1]}<br><br>
      <table class="output-table" style="font-size:0.8rem;">
        <thead><tr><th>#</th><th>Block</th><th>Note</th></tr></thead>
        <tbody>${blockList}</tbody>
      </table>`;
  }

  if (f.algo === 'indexed') {
    const ptrRows = f.blocks.map((b, i) =>
      `<tr><td>IDX[${i}]</td><td>${b}</td></tr>`).join('');
    return `
      <strong>Index Block:</strong> ${f.indexBlocks[0]} &nbsp;|&nbsp;
      <strong>Data Blocks:</strong> ${f.blocks.join(' → ')}<br><br>
      <table class="output-table" style="font-size:0.8rem;">
        <thead><tr><th>Pointer</th><th>Data Block</th></tr></thead>
        <tbody>${ptrRows}</tbody>
      </table>`;
  }

  if (f.algo === 'linked') {
    const chainHTML = f.blocks.map(b =>
      `<div class="chain-node" style="background:${f.color};">${b}</div>`
    ).join('<div class="chain-arrow">→</div>');
    const linkRows = f.blocks.map((b, i) => [
      i+1, b,
      i===0 ? '<em>HEAD</em>' : f.blocks[i-1],
      i<f.blocks.length-1 ? f.blocks[i+1] : '<em>NULL</em>',
    ]).map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('');
    return `
      <div class="chain-row">${chainHTML}<div class="chain-arrow">→</div><span class="chain-null">NULL</span></div>
      <table class="output-table" style="font-size:0.8rem;margin-top:8px;">
        <thead><tr><th>#</th><th>Block</th><th>Prev</th><th>Next</th></tr></thead>
        <tbody>${linkRows}</tbody>
      </table>`;
  }

  if (f.algo === 'extindexed') {
    const half      = Math.ceil(f.blocks.length / 2);
    const b1Blocks  = f.blocks.slice(0, half);
    const b2Blocks  = f.blocks.slice(half);
    const rows1 = b1Blocks.map((b,i) => `<tr><td>IDX1[${i}]</td><td>${b}</td></tr>`).join('');
    const rows2 = b2Blocks.map((b,i) => `<tr><td>IDX2[${i}]</td><td>${b}</td></tr>`).join('');
    return `
      <strong>Index Block 1:</strong> ${f.indexBlocks[0]} &nbsp;→&nbsp;
      <strong>Index Block 2:</strong> ${f.indexBlocks[1]}<br><br>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <table class="output-table" style="font-size:0.8rem;flex:1;">
          <thead><tr><th>Ptr (IDX1)</th><th>Block</th></tr></thead>
          <tbody>${rows1}</tbody>
        </table>
        <table class="output-table" style="font-size:0.8rem;flex:1;">
          <thead><tr><th>Ptr (IDX2)</th><th>Block</th></tr></thead>
          <tbody>${rows2}</tbody>
        </table>
      </div>`;
  }
  return '';
}

function toggleDetail(fid, btn) {
  const panel = document.getElementById('detail-' + fid);

  if(!panel) return;

  const open  = panel.classList.toggle('open');
  btn.textContent = open ? '▲ Hide' : '▼ Details';
}

/* ── ALLOCATE FILE ───────────────────────────────────────────── */
function allocateFile() {
  if (!diskInitialized) return showError('⚠️ Please initialize the disk first.');
  clearMessages();

  const name = document.getElementById('file-name').value.trim();
  const size = parseInt(document.getElementById('file-size').value);

  if (!name)           return showError('⚠️ Please enter a file name.');
  if (isNaN(size) || size <= 0) return showError('⚠️ File size must be a positive number.');

  // Check duplicate name
  if (Object.values(files).some(f => f.name === name))
    return showError(`⚠️ A file named "${name}" already exists. Use a different name.`);

  const needed = blocksNeeded(size);
  if (needed === 0) return showError('⚠️ File size too small (less than 1 block).');

  let result;
  switch (currentAlgo) {
    case 'sequential': result = allocSequential(name, size, needed); break;
    case 'indexed':    result = allocIndexed(name, size, needed);    break;
    case 'linked':     result = allocLinked(name, size, needed);     break;
    case 'extindexed': result = allocExtIndexed(name, size, needed); break;
  }

  if (!result) return; // error shown inside alloc functions

  // Register file
  const fid   = 'f' + (++fileCounter);
  const color = FILE_COLORS[colorIdx % FILE_COLORS.length];
  colorIdx++;

  files[fid] = { name, algo: currentAlgo, size, color, ...result };

  // Mark blocks occupied
  result.blocks.forEach(b => { occupiedBy[b] = fid; });
  if (result.indexBlocks) result.indexBlocks.forEach(b => { occupiedBy[b] = fid; });

  renderDiskGrid();
  renderFAT();
  showSuccess(`✅ "${name}" allocated successfully using ${currentAlgo} strategy.`);

  // Clear inputs
  document.getElementById('file-name').value = '';
  document.getElementById('file-size').value = '';
}

/* ── Sequential Allocation ───────────────────────────────────── */
function allocSequential(name, size, needed) {
  // Find first contiguous run
  for (let i = 0; i <= TOTAL_BLOCKS - needed; i++) {
    let ok = true;
    for (let j = i; j < i + needed; j++) {
      if (occupiedBy[j] !== null) { ok = false; break; }
    }
    if (ok) {
      const blocks = [];
      for (let j = i; j < i + needed; j++) blocks.push(j);
      return { blocks, indexBlocks: [] };
    }
  }
  showError(`⚠️ Not enough contiguous free blocks. Need ${needed} in a row, but disk is fragmented. Try Linked or Indexed.`);
  return null;
}

/* ── Indexed Allocation ──────────────────────────────────────── */
function allocIndexed(name, size, needed) {
  // Need: 1 index block + needed data blocks
  if (freeBlocks() < needed + 1) {
    showError(`⚠️ Not enough free blocks. Need ${needed + 1} (${needed} data + 1 index), only ${freeBlocks()} free.`);
    return null;
  }

  const allFree = [];
  for (let i = 0; i < TOTAL_BLOCKS; i++) if (occupiedBy[i] === null) allFree.push(i);

  const indexBlock = allFree[0];
  const dataBlocks = allFree.slice(1, 1 + needed);

  return { blocks: dataBlocks, indexBlocks: [indexBlock] };
}

/* ── Linked Allocation ───────────────────────────────────────── */
function allocLinked(name, size, needed) {
  if (freeBlocks() < needed) {
    showError(`⚠️ Not enough free blocks. Need ${needed}, only ${freeBlocks()} free.`);
    return null;
  }

  const blocks = [];
  for (let i = 0; i < TOTAL_BLOCKS && blocks.length < needed; i++) {
    if (occupiedBy[i] === null) blocks.push(i);
  }

  return { blocks, indexBlocks: [] };
}

/* ── Extended Indexed Allocation ─────────────────────────────── */
function allocExtIndexed(name, size, needed) {
  // Need: 2 index blocks + needed data blocks
  const totalNeeded = needed + 2;
  if (freeBlocks() < totalNeeded) {
    showError(`⚠️ Not enough free blocks. Need ${totalNeeded} (${needed} data + 2 index), only ${freeBlocks()} free.`);
    return null;
  }
  if (needed < 2) {
    showError('⚠️ Extended Indexed needs at least 2 data blocks. Use a larger file size.');
    return null;
  }

  const allFree = [];
  for (let i = 0; i < TOTAL_BLOCKS; i++) if (occupiedBy[i] === null) allFree.push(i);

  const idx1       = allFree[0];
  const idx2       = allFree[1];
  const dataBlocks = allFree.slice(2, 2 + needed);

  return { blocks: dataBlocks, indexBlocks: [idx1, idx2] };
}

/* ── DEALLOCATE FILE ─────────────────────────────────────────── */
function deallocateFile(fid) {
  const f = files[fid];
  if (!f) return;

  // Free all blocks
  f.blocks.forEach(b => { occupiedBy[b] = null; });
  if (f.indexBlocks) f.indexBlocks.forEach(b => { occupiedBy[b] = null; });

  delete files[fid];

  renderDiskGrid();
  renderFAT();
  showSuccess(`✅ "${f.name}" deallocated. Blocks are now free.`);
}

/* ── RESET ENTIRE DISK ───────────────────────────────────────── */
function confirmResetDisk() {
  if (!confirm('Reset the entire disk? All files will be lost.')) return;
  resetAll();
}

function resetAll() {
  diskInitialized = false;
  occupiedBy      = [];
  files           = {};
  fileCounter     = 0;
  colorIdx        = 0;

  // Unlock config
  document.getElementById('cfg-total').disabled     = false;
  document.getElementById('cfg-blocksize').disabled = false;
  document.getElementById('cfg-btn').textContent    = '✔ Apply & Initialize Disk';
  document.getElementById('cfg-btn').disabled       = false;
  document.getElementById('cfg-total').value        = '25';
  document.getElementById('cfg-blocksize').value    = '50';

  document.getElementById('disk-visual-card').style.display = 'none';
  document.getElementById('alloc-card').style.display       = 'none';

  document.getElementById('visual-output').innerHTML = `
    <div class="output-placeholder">
      <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
      <p>Initialize the disk above, then allocate files to see the File Allocation Table here.</p>
    </div>`;

  clearMessages();
}