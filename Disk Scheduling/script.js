/* ============================================================
   Module 4: Disk Scheduling
   Algorithms: FCFS, SSTF, RDS, PDS, SCAN, C-SCAN, LOOK, C-LOOK
   ============================================================ */

/* ── State ──────────────────────────────────────────────────── */
let selectedAlgo = 'FCFS';
let animationTimer = null;

/* ── Algo Descriptions ──────────────────────────────────────── */
const ALGO_DESC = {
  FCFS:     'Serves requests in the order they arrive. Simple but may cause high seek distances.',
  SSTF:     'Selects the closest request to current head. Reduces seek time but may starve far requests.',
  RDS:      'Picks requests in a random order. No optimization — used as a performance baseline.',
  PDS:      'Serves requests by user-assigned priority. Low-priority requests may starve.',
  SCAN:     'Moves head in one direction servicing all requests, then reverses direction like an elevator.',
  'C-SCAN': 'Moves in one direction, jumps back to start after reaching end. Provides uniform wait times.',
  LOOK:     'Like SCAN but only travels as far as the last request in each direction — no wasted movement.',
  'C-LOOK': 'Like C-SCAN but jumps to the lowest request instead of disk start. More efficient.',
};

/* ── Algo Popup Data ────────────────────────────────────────── */
const ALGO_INFO = {
  FCFS: {
    description: 'First Come First Served processes requests in the exact order they arrive in the queue. The disk head simply moves from one request to the next regardless of position.',
    keyPoints: ['No starvation', 'FIFO scheduling', 'Simple to implement', 'No request reordering'],
    advantages: ['Fair to all requests', 'Easy to implement', 'Predictable behavior'],
    disadvantages: ['High seek time possible', 'Inefficient head movement', 'Poor performance under heavy load'],
  },
  SSTF: {
    description: 'Shortest Seek Time First selects the request closest to the current head position at each step, minimizing each individual seek.',
    keyPoints: ['Greedy selection', 'Minimizes each step', 'May cause starvation', 'Not globally optimal'],
    advantages: ['Lower average seek time', 'Better throughput than FCFS', 'Efficient for clustered requests'],
    disadvantages: ['Starvation of far requests', 'Not globally optimal', 'Overhead of finding minimum'],
  },
  SCAN: {
    description: 'The SCAN algorithm moves the disk head in one direction, servicing all requests until it reaches the disk end, then reverses — like an elevator.',
    keyPoints: ['Elevator algorithm', 'Bidirectional sweep', 'No starvation', 'Travels to disk ends'],
    advantages: ['Low variance in wait time', 'No starvation', 'Better than FCFS'],
    disadvantages: ['Travels to disk end even if no requests', 'Requests just missed must wait full cycle'],
  },
  'C-SCAN': {
    description: 'Circular SCAN moves the head in one direction only. After reaching the last request at the end, it jumps back to the beginning without servicing requests on the return.',
    keyPoints: ['Unidirectional sweep', 'Circular operation', 'Uniform wait times', 'Jumps to disk start'],
    advantages: ['More uniform wait times', 'Predictable behavior', 'Fair for all positions'],
    disadvantages: ['Extra seek to return to start', 'May not serve return path requests'],
  },
  LOOK: {
    description: 'LOOK is an improvement over SCAN. The head only travels as far as the last request in each direction, then reverses — it does not travel to the physical disk ends.',
    keyPoints: ['No wasted end travel', 'Bidirectional', 'More efficient than SCAN', 'Stops at last request'],
    advantages: ['Less wasted movement', 'Better than SCAN', 'More efficient'],
    disadvantages: ['Requests just missed still wait', 'More complex than SCAN'],
  },
  'C-LOOK': {
    description: 'Circular LOOK moves unidirectionally and after serving the highest request, jumps to the lowest pending request — not to the physical disk start.',
    keyPoints: ['Unidirectional', 'Jumps to lowest request', 'No end-to-end travel', 'Efficient circular sweep'],
    advantages: ['Most efficient circular algorithm', 'Uniform service', 'Less wasted head movement'],
    disadvantages: ['Complex to implement', 'Jump time not zero but is usually ignored'],
  },
  RDS: {
    description: 'Random Disk Scheduling selects the next request randomly from the pending queue. It has no optimization strategy and is mainly used as a worst-case baseline for comparison.',
    keyPoints: ['No ordering logic', 'Non-deterministic', 'Baseline comparison', 'Unpredictable seek pattern'],
    advantages: ['Trivial to implement', 'No computation overhead', 'Useful as a benchmark'],
    disadvantages: ['Worst average seek time', 'Highly unpredictable', 'No fairness guarantee', 'Not used in practice'],
  },
  PDS: {
    description: 'Priority-based Disk Scheduling serves requests ordered by user-assigned priority values. Priority 1 is highest. Requests with equal priority are served in arrival order (stable sort).',
    keyPoints: ['User-defined priorities', 'Priority 1 = highest', 'Stable sort on equal priority', 'Deterministic ordering'],
    advantages: ['Critical requests served first', 'Flexible scheduling control', 'Useful in real-time systems'],
    disadvantages: ['Low-priority requests may starve', 'Requires priority assignment overhead', 'Seek distance not optimized'],
  },
};

/* ── Theme Toggle ───────────────────────────────────────────── */
function toggleTheme() {
  const html = document.documentElement;
  html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}

/* ── Algorithm Selection ────────────────────────────────────── */
document.getElementById('algoToggle').addEventListener('click', e => {
  const btn = e.target.closest('.ds-toggle');
  if (!btn) return;
  document.querySelectorAll('.ds-toggle').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedAlgo = btn.dataset.algo;
  document.getElementById('algoDesc').textContent = ALGO_DESC[selectedAlgo];

  const needsDir = ['SCAN','C-SCAN','LOOK','C-LOOK'].includes(selectedAlgo);
  document.getElementById('directionGroup').style.display = needsDir ? '' : 'none';

  const needsPriority = selectedAlgo === 'PDS';
  document.getElementById('priorityGroup').style.display = needsPriority ? '' : 'none';
});

// Init direction visibility
document.getElementById('directionGroup').style.display = 'none';

/* ── Queue Helpers ──────────────────────────────────────────── */
function generateRandom() {
  const size = parseInt(document.getElementById('diskSize').value) || 200;
  const count = 8 + Math.floor(Math.random() * 5);
  const nums = Array.from({ length: count }, () => Math.floor(Math.random() * size));
  document.getElementById('reqQueue').value = nums.join(', ');
}

function clearQueue() {
  document.getElementById('reqQueue').value = '';
  document.getElementById('reqQueue').placeholder = 'e.g. 82, 170, 43, 140, 24';
}

function addRequest() {
  const field = document.getElementById('reqQueue');
  const diskSize = parseInt(document.getElementById('diskSize').value) || 200;
  const raw = field.value.trim();

  if (!raw) {
    // Random single value
    const val = Math.floor(Math.random() * diskSize);
    field.value = val.toString();
    return;
  }

  // Validate current content
  const parts = raw.split(',').map(s => s.trim());
  const valid = parts.every(p => /^\d+$/.test(p) && parseInt(p) < diskSize);
  if (!valid) {
    showError('⚠ Invalid queue. Use comma-separated numbers within disk size range.');
    return;
  }

  // Add a random new request
  const existing = new Set(parts.map(Number));
  let newVal;
  do { newVal = Math.floor(Math.random() * diskSize); } while (existing.has(newVal));
  field.value = [...parts, newVal].join(', ');
  clearError();
}

/* ── Error Helpers ──────────────────────────────────────────── */
function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
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

/* ── Popup ──────────────────────────────────────────────────── */
function openPopup(algo) {
  const info = ALGO_INFO[algo];
  document.getElementById('popupTitle').textContent = algo;
  document.getElementById('popupBody').innerHTML = `
    <div class="ds-popup-section">
      <div class="ds-popup-section-title">Description</div>
      <p class="ds-popup-text">${info.description}</p>
    </div>

    <div class="ds-popup-section">
      <div class="ds-popup-section-title">Key Points</div>
      <div class="ds-popup-grid-2">
        <ul>${info.keyPoints.slice(0, Math.ceil(info.keyPoints.length / 2)).map(k => `<li>${k}</li>`).join('')}</ul>
        <ul>${info.keyPoints.slice(Math.ceil(info.keyPoints.length / 2)).map(k => `<li>${k}</li>`).join('')}</ul>
      </div>
    </div>

    <div class="ds-popup-section">
      <div class="ds-popup-grid-2">
        <div>
          <div class="ds-popup-section-title">Advantages</div>
          <ul>${info.advantages.map(k => `<li>${k}</li>`).join('')}</ul>
        </div>
        <div>
          <div class="ds-popup-section-title">Disadvantages</div>
          <ul>${info.disadvantages.map(k => `<li>${k}</li>`).join('')}</ul>
        </div>
      </div>
    </div>
  `;
  document.getElementById('popupOverlay').classList.remove('hidden');
}

function closePopup() {
  document.getElementById('popupOverlay').classList.add('hidden');
}

/* ── Algorithms ─────────────────────────────────────────────── */
function runFCFS(requests, head) {
  const order = [head, ...requests];
  return buildSeekResult(order);
}
/* ─────────────────────────────────────────────────────── */

function runSSTF(requests, head) {
  const pending = [...requests];
  const order = [head];
  let cur = head;
  while (pending.length) {
    pending.sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur));
    cur = pending.shift();
    order.push(cur);
  }
  return buildSeekResult(order);
}
 /* ─────────────────────────────────────────────────────── */
function runSCAN(requests, head, direction, diskSize) {
  const sorted = [...requests].sort((a, b) => a - b);
  const above = sorted.filter(r => r >= head);
  const below = sorted.filter(r => r < head).reverse();
  let order;
  if (direction === 'up') {
    order = [head, ...above, diskSize - 1, ...below];
  } else {
    order = [head, ...below, 0, ...above];
  }
  return buildSeekResult(order);
}
/* ─────────────────────────────────────────────────────── */
function runCSCAN(requests, head, diskSize) {
  const sorted = [...requests].sort((a, b) => a - b);
  const above = sorted.filter(r => r >= head);
  const below = sorted.filter(r => r < head);
  const order = [head, ...above, diskSize - 1, 0, ...below];
  return buildSeekResult(order);
}
/* ─────────────────────────────────────────────────────── */
function runLOOK(requests, head, direction) {
  const sorted = [...requests].sort((a, b) => a - b);
  const above = sorted.filter(r => r >= head);
  const below = sorted.filter(r => r < head).reverse();
  let order;
  if (direction === 'up') {
    order = [head, ...above, ...below];
  } else {
    order = [head, ...below, ...above];
  }
  return buildSeekResult(order);
}
/* ─────────────────────────────────────────────────────── */
function runCLOOK(requests, head) {
  const sorted = [...requests].sort((a, b) => a - b);
  const above = sorted.filter(r => r >= head);
  const below = sorted.filter(r => r < head);
  const order = [head, ...above, ...below];
  return buildSeekResult(order);
}
/* ─────────────────────────────────────────────────────── */
function runRDS(requests, head) {
  const shuffled = [...requests].sort(() => Math.random() - 0.5);
  const order = [head, ...shuffled];
  return buildSeekResult(order);
}
/* ─────────────────────────────────────────────────────── */
function runPDS(requests, priorities, head) {
  // Pair each request with its priority, sort by priority (stable: lower number = higher priority)
  const paired = requests.map((r, i) => ({ track: r, priority: priorities[i] ?? 999 }));
  paired.sort((a, b) => a.priority - b.priority);
  const order = [head, ...paired.map(p => p.track)];
  return buildSeekResult(order);
}
/* ─────────────────────────────────────────────────────── */
function buildSeekResult(order) {
  let totalSeek = 0;
  const steps = [];
  for (let i = 1; i < order.length; i++) {
    const dist = Math.abs(order[i] - order[i - 1]);
    totalSeek += dist;
    steps.push({ from: order[i - 1], to: order[i], dist });
  }
  return { order, steps, totalSeek };
}

/* ── Run Simulation ─────────────────────────────────────────── */
function runSimulation() {
  clearError();

  const diskSize = parseInt(document.getElementById('diskSize').value);
  const headPos  = parseInt(document.getElementById('headPos').value);
  const rawQueue = document.getElementById('reqQueue').value.trim();
  const direction = document.getElementById('direction').value;

  if (!rawQueue) { showError('⚠ Please enter a request queue.'); return; }
  if (isNaN(diskSize) || diskSize < 2) { showError('⚠ Disk size must be at least 2.'); return; }
  if (isNaN(headPos) || headPos < 0 || headPos >= diskSize) {
    showError(`⚠ Head position must be between 0 and ${diskSize - 1}.`); return;
  }

  const parts = rawQueue.split(',').map(s => s.trim());
  if (!parts.every(p => /^\d+$/.test(p))) {
    showError('⚠ Request queue must contain only comma-separated numbers.'); return;
  }

  const requests = parts.map(Number);
  if (requests.some(r => r < 0 || r >= diskSize)) {
    showError(`⚠ All requests must be within disk range 0–${diskSize - 1}.`); return;
  }

  // PDS: parse and validate priorities
  let priorities = [];
  if (selectedAlgo === 'PDS') {
    const rawPri = document.getElementById('priorities').value.trim();
    if (!rawPri) { showError('⚠ Please enter priorities for PDS.'); return; }
    const priParts = rawPri.split(',').map(s => s.trim());
    if (priParts.length !== parts.length) {
      showError(`⚠ Number of priorities (${priParts.length}) must match number of requests (${parts.length}).`); return;
    }
    if (!priParts.every(p => /^\d+$/.test(p) && parseInt(p) >= 1)) {
      showError('⚠ Priorities must be positive integers (1 = highest).'); return;
    }
    priorities = priParts.map(Number);
  }

  let result;
  switch (selectedAlgo) {
    case 'FCFS':   result = runFCFS(requests, headPos); break;
    case 'SSTF':   result = runSSTF(requests, headPos); break;
    case 'RDS':    result = runRDS(requests, headPos); break;
    case 'PDS':    result = runPDS(requests, priorities, headPos); break;
    case 'SCAN':   result = runSCAN(requests, headPos, direction, diskSize); break;
    case 'C-SCAN': result = runCSCAN(requests, headPos, diskSize); break;
    case 'LOOK':   result = runLOOK(requests, headPos, direction); break;
    case 'C-LOOK': result = runCLOOK(requests, headPos); break;
    default: return;
  }

  const avgSeek    = (result.totalSeek / result.steps.length).toFixed(2);
  const maxPossible = (diskSize - 1) * requests.length;
  const efficiency = (100 - (result.totalSeek / maxPossible) * 100).toFixed(1);

  renderSimulation(result, requests, headPos, diskSize, avgSeek, efficiency);

  // Scroll to output
  document.getElementById('visual-output').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Render Simulation ──────────────────────────────────────── */
function renderSimulation(result, requests, headPos, diskSize, avgSeek, efficiency) {
  const { order, steps, totalSeek } = result;

  // Request badges
  const badgesHTML = order.slice(1).map(r => `
    <span class="ds-req-badge pending" id="badge-${r}">${r}</span>
  `).join('');

  // Stats
  const statsHTML = `
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-value">${steps.length}</div>
        <div class="stat-label">Seek Operations</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${totalSeek}</div>
        <div class="stat-label">Total Seek Distance</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${avgSeek}</div>
        <div class="stat-label">Avg Seek Length</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${efficiency}%</div>
        <div class="stat-label">Algorithm Efficiency</div>
      </div>
    </div>
  `;

  // Step table
  const tableRows = steps.map((s, i) => `
    <tr id="step-row-${i}">
      <td>${i + 1}</td>
      <td>${s.from}</td>
      <td>${s.to}</td>
      <td>${s.dist}</td>
    </tr>
  `).join('');

  const tableHTML = `
    <table class="output-table" style="margin-top:16px;">
      <thead>
        <tr>
          <th>Step</th>
          <th>From</th>
          <th>To</th>
          <th>Seek Distance</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  renderOutput(`
    <div class="ds-sim-section">
      <h3 class="ds-sim-heading">Simulation — ${selectedAlgo}</h3>
      <div class="ds-sim-label">Request Queue — ${order.length - 1} requests</div>
      <hr class="panel-divider" />
      <div class="ds-req-badges">${badgesHTML}</div>
    </div>

    <div class="ds-sim-section">
      <div class="ds-sim-label">Visual Simulation</div>
      <div class="ds-legend">
        <div class="ds-legend-item"><div class="ds-legend-dot pending"></div>Pending</div>
        <div class="ds-legend-item"><div class="ds-legend-dot current"></div>Current</div>
        <div class="ds-legend-item"><div class="ds-legend-dot done"></div>Done</div>
      </div>
      <div class="ds-canvas-wrap">
        <div class="ds-track-ruler">
          <span>0</span>
          <span>${Math.floor(diskSize / 4)}</span>
          <span>${Math.floor(diskSize / 2)}</span>
          <span>${Math.floor(3 * diskSize / 4)}</span>
          <span>${diskSize - 1}</span>
        </div>
        <canvas class="ds-canvas" id="seekCanvas" height="260"></canvas>
      </div>
    </div>

    <div class="ds-sim-section">${statsHTML}</div>

    <div class="ds-sim-section">
      <div class="ds-sim-label">Step-by-Step Seek Trace</div>
      ${tableHTML}
    </div>
  `);

  // Draw canvas after DOM update
  requestAnimationFrame(() => drawSeekPath(order, diskSize, headPos, steps));
}

/* ── Canvas Visualization ───────────────────────────────────── */
function drawSeekPath(order, diskSize, headPos, steps) {
  const canvas = document.getElementById('seekCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const W = canvas.offsetWidth;
  canvas.width = W;
  const H = canvas.height;

  const PAD_L = 10, PAD_R = 10;
  const PAD_T = 30, PAD_B = 20;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const n = order.length;
  const rowH = plotH / (n - 1);

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const colBg      = css.getPropertyValue('--bg-card-alt').trim();
    const colGrid    = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
    const colPending = css.getPropertyValue('--disk-pending').trim();
    const colDone    = css.getPropertyValue('--disk-done').trim();
    const colCurrent = css.getPropertyValue('--disk-current').trim();
    const colLine    = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  function xPos(track) {
    return PAD_L + (track / (diskSize - 1)) * plotW;
  }

  function yPos(idx) {
    return PAD_T + idx * rowH;
  }

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = colBg;
  ctx.fillRect(0, 0, W, H);

  // Vertical grid lines at ruler positions
  [0, 0.25, 0.5, 0.75, 1].forEach(frac => {
    const x = PAD_L + frac * plotW;
    ctx.strokeStyle = colGrid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, PAD_T);
    ctx.lineTo(x, H - PAD_B);
    ctx.stroke();
  });

  // Horizontal row lines
  for (let i = 0; i < n; i++) {
    const y = yPos(i);
    ctx.strokeStyle = colLine;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(PAD_L, y);
    ctx.lineTo(W - PAD_R, y);
    ctx.stroke();
  }

  // Animate step by step
  let step = 0;
  const speed = parseInt(document.getElementById('animSpeed').value) || 50;
  const delay = Math.max(50, 1100 - speed * 10);

  if (animationTimer) clearInterval(animationTimer);

  function drawStep() {
    if (step >= n - 1) {
      clearInterval(animationTimer);
      return;
    }

    const i = step;
    const x1 = xPos(order[i]);
    const y1 = yPos(i);
    const x2 = xPos(order[i + 1]);
    const y2 = yPos(i + 1);

    // Draw seek line
    ctx.strokeStyle = colCurrent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw previous dot as done
    ctx.fillStyle = i === 0 ? colCurrent : colDone;
    ctx.beginPath();
    ctx.arc(x1, y1, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw current dot
    ctx.fillStyle = colCurrent;
    ctx.beginPath();
    ctx.arc(x2, y2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Track label
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(order[i + 1], x2, y2 - 10);

    // Update badge
    const badge = document.getElementById(`badge-${order[i + 1]}`);
    if (badge) badge.className = 'ds-req-badge current';
    if (i > 0) {
      const prevBadge = document.getElementById(`badge-${order[i]}`);
      if (prevBadge) prevBadge.className = 'ds-req-badge done';
    }

    // Highlight step row
    const row = document.getElementById(`step-row-${i}`);
    if (row) {
      row.classList.add('step-highlight');
      if (i > 0) {
        const prevRow = document.getElementById(`step-row-${i - 1}`);
        if (prevRow) prevRow.classList.remove('step-highlight');
      }
    }

    step++;
  }

  // Draw initial head position dot
  ctx.fillStyle = colCurrent;
  ctx.beginPath();
  ctx.arc(xPos(order[0]), yPos(0), 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  ctx.font = '10px IBM Plex Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`H:${order[0]}`, xPos(order[0]), yPos(0) - 10);

  animationTimer = setInterval(drawStep, delay);
}

/* ── Reset ──────────────────────────────────────────────────── */
function resetAll() {
  if (animationTimer) { clearInterval(animationTimer); animationTimer = null; }
  clearError();
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
