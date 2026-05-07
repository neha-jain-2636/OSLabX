'use strict';

let currentAlgo = 'fifo';

const ALGO_DESCS = {
  fifo:    'FIFO replaces the page that has been in memory the longest. Simple but may not reflect actual usage patterns.',
  belady:  "Belady's Anomaly: FIFO can produce <em>more</em> page faults when given <em>more</em> frames. This tool scans a range of frame counts and highlights any inversions.",
  lru:     'LRU replaces the page that was least recently used. Requires tracking the usage history of each page.',
  optimal: 'Optimal (OPT / Bélády) replaces the page that will not be used for the longest time in the future. Provides the minimum possible page faults — a theoretical baseline.',
  mfu:     'MFU (Most Frequently Used) replaces the page with the highest use frequency, on the assumption that pages used many times in the past are less likely to be needed again.',
};

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearError() {
  document.getElementById('error-msg').classList.add('hidden');
}

function parseRefString() {
  const raw = document.getElementById('ref-string').value.trim();
  if (!raw) return null;
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map(Number);
  if (nums.some(isNaN)) return null;
  return nums;
}

function getFrameCount() {
  return parseInt(document.getElementById('frame-count').value, 10);
}

function switchAlgo(algo, btn) {
  currentAlgo = algo;
  document.querySelectorAll('.algo-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('algo-desc').innerHTML = ALGO_DESCS[algo];
  const bPanel = document.getElementById('belady-controls');
  if (algo === 'belady') {
    bPanel.classList.remove('hidden');
  } else {
    bPanel.classList.add('hidden');
  }
  resetAll();
}

function resetAll() {
  clearError();
  document.getElementById('visual-output').innerHTML = `
    <div class="output-placeholder">
      <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p>Configure your reference string and frames above, then click <strong>Run Simulation</strong>.</p>
    </div>`;
  document.getElementById('stats-section').classList.add('hidden');
}

function runSimulation() {
  clearError();

  const pages = parseRefString();
  if (!pages || pages.length === 0) {
    showError('Please enter a valid page reference string (space or comma separated integers).');
    return;
  }

  const frames = getFrameCount();
  if (isNaN(frames) || frames < 1 || frames > 10) {
    showError('Number of frames must be between 1 and 10.');
    return;
  }

  switch (currentAlgo) {
    case 'fifo':    runFIFO(pages, frames);    break;
    case 'belady':  runBelady(pages, frames);  break;
    case 'lru':     runLRU(pages, frames);     break;
    case 'optimal': runOptimal(pages, frames); break;
    case 'mfu':     runMFU(pages, frames);     break;
  }
}

function simulateFIFO(pages, numFrames) {
  const frames = new Array(numFrames).fill(null);
  const queue  = [];
  const steps  = [];
  let faults   = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const inFrame = frames.includes(page);
    let replaced = null;

    if (!inFrame) {
      faults++;
      if (queue.length === numFrames) {
        replaced = queue.shift();
        const idx = frames.indexOf(replaced);
        frames[idx] = page;
      } else {
        const empty = frames.indexOf(null);
        frames[empty] = page;
      }
      queue.push(page);
    }

    steps.push({
      page,
      frames: [...frames],
      fault: !inFrame,
      replaced,
      newlyLoaded: !inFrame ? page : null,
    });
  }

  return { steps, faults, hits: pages.length - faults };
}

function runFIFO(pages, numFrames) {
  const { steps, faults, hits } = simulateFIFO(pages, numFrames);
  renderStepTable('⏩ FIFO Simulation', pages, steps, faults, hits, numFrames, 'fifo');
}

function runLRU(pages, numFrames) {
  const frames   = new Array(numFrames).fill(null);
  const lastUsed = {};
  const steps    = [];
  let faults     = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const inFrame = frames.includes(page);
    let replaced = null;

    if (!inFrame) {
      faults++;
      if (frames.includes(null)) {
        const empty = frames.indexOf(null);
        frames[empty] = page;
      } else {
        let lruPage = null, lruTime = Infinity;
        for (const f of frames) {
          const t = lastUsed[f] !== undefined ? lastUsed[f] : -1;
          if (t < lruTime) { lruTime = t; lruPage = f; }
        }
        replaced = lruPage;
        const idx = frames.indexOf(lruPage);
        frames[idx] = page;
      }
    }

    lastUsed[page] = i;

    steps.push({
      page,
      frames: [...frames],
      fault: !inFrame,
      replaced,
      newlyLoaded: !inFrame ? page : null,
    });
  }

  renderStepTable('🕐 LRU Simulation', pages, steps, faults, pages.length - faults, numFrames, 'lru');
}

function runOptimal(pages, numFrames) {
  const frames = new Array(numFrames).fill(null);
  const steps  = [];
  let faults   = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const inFrame = frames.includes(page);
    let replaced = null;

    if (!inFrame) {
      faults++;
      if (frames.includes(null)) {
        const empty = frames.indexOf(null);
        frames[empty] = page;
      } else {
        let victim = null, furthest = -1;
        for (const f of frames) {
          const nextUse = pages.indexOf(f, i + 1);
          const dist = nextUse === -1 ? Infinity : nextUse;
          if (dist > furthest) { furthest = dist; victim = f; }
        }
        replaced = victim;
        const idx = frames.indexOf(victim);
        frames[idx] = page;
      }
    }

    steps.push({
      page,
      frames: [...frames],
      fault: !inFrame,
      replaced,
      newlyLoaded: !inFrame ? page : null,
    });
  }

  renderStepTable('🎯 Optimal Simulation', pages, steps, faults, pages.length - faults, numFrames, 'optimal');
}

function runMFU(pages, numFrames) {
  const frames   = new Array(numFrames).fill(null);
  const freq     = {};
  const loadTime = {};
  const steps    = [];
  let faults     = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const inFrame = frames.includes(page);
    let replaced = null;

    if (!inFrame) {
      faults++;
      freq[page] = (freq[page] || 0) + 1;

      if (frames.includes(null)) {
        const empty = frames.indexOf(null);
        frames[empty] = page;
        loadTime[page] = i;
      } else {
        let victim = null, maxFreq = -1, minLoad = Infinity;
        for (const f of frames) {
          const fq = freq[f] || 0;
          const lt = loadTime[f] !== undefined ? loadTime[f] : 0;
          if (fq > maxFreq || (fq === maxFreq && lt < minLoad)) {
            maxFreq = fq; minLoad = lt; victim = f;
          }
        }
        replaced = victim;
        const idx = frames.indexOf(victim);
        frames[idx] = page;
        loadTime[page] = i;
      }
    } else {
      freq[page] = (freq[page] || 0) + 1;
    }

    const frameFreqs = frames.map(f => ({ page: f, freq: freq[f] || 0 }));

    steps.push({
      page,
      frames: [...frames],
      fault: !inFrame,
      replaced,
      newlyLoaded: !inFrame ? page : null,
      frameFreqs,
    });
  }

  renderStepTable('📊 MFU Simulation', pages, steps, faults, pages.length - faults, numFrames, 'mfu', freq);
}

function runBelady(pages, _baseFrames) {
  const maxF = parseInt(document.getElementById('belady-max-frames').value, 10) || 7;

  const results = [];
  for (let f = 1; f <= maxF; f++) {
    const { faults } = simulateFIFO(pages, f);
    results.push({ frames: f, faults });
  }

  let anomalyFound = false;
  const anomalies = [];
  for (let i = 1; i < results.length; i++) {
    if (results[i].faults > results[i - 1].faults) {
      anomalyFound = true;
      anomalies.push({ from: i, to: i + 1 });
    }
  }

  const maxFaults = Math.max(...results.map(r => r.faults));

  let html = `
    <div class="output-section-title">
      ⚡ Belady's Anomaly Analysis
      <span class="badge ${anomalyFound ? 'badge-error' : 'badge-success'}">
        ${anomalyFound ? 'Anomaly Detected!' : 'No Anomaly'}
      </span>
    </div>
    <p style="font-size:0.83rem;color:var(--text-muted);margin-bottom:16px;">
      Using reference string: <code>${pages.join(' ')}</code><br/>
      Scanning FIFO with <strong>1 – ${maxF} frames</strong>.
      ${anomalyFound
        ? 'Bars in <span style="color:var(--error);font-weight:700">red</span> indicate more faults than the previous frame count — Belady\'s Anomaly.'
        : 'No case found where adding more frames increased page faults.'}
    </p>
    <div class="belady-chart">`;

  results.forEach((r, idx) => {
    const isAnomaly = idx > 0 && r.faults > results[idx - 1].faults;
    const pct = maxFaults > 0 ? Math.max(4, Math.round((r.faults / maxFaults) * 100)) : 4;
    html += `
      <div class="belady-bar-row">
        <span class="belady-bar-label">${r.frames} Frame${r.frames > 1 ? 's' : ''}</span>
        <div class="belady-bar-track">
          <div class="belady-bar-fill ${isAnomaly ? 'anomaly' : 'normal'}" style="width:${pct}%">
            ${r.faults}
          </div>
        </div>
        <span class="${isAnomaly ? 'belady-anomaly-badge' : 'belady-ok-badge'}">
          ${r.faults} faults${isAnomaly ? ' ⚠ Anomaly' : ' ✓'}
        </span>
      </div>`;
  });

  html += `</div>`;

  html += `
    <div style="margin-top:20px;">
      <div class="output-section-title" style="margin-bottom:8px;">📋 Detailed Results Table</div>
      <div class="step-table-wrapper">
        <table class="step-table output-table">
          <thead>
            <tr>
              <th>Frames</th>
              <th>Page Faults</th>
              <th>Page Hits</th>
              <th>Hit Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>`;

  results.forEach((r, idx) => {
    const hits = pages.length - r.faults;
    const hitRate = ((hits / pages.length) * 100).toFixed(1);
    const isAnomaly = idx > 0 && r.faults > results[idx - 1].faults;
    html += `
      <tr>
        <td><strong>${r.frames}</strong></td>
        <td><span class="cell-fault">${r.faults}</span></td>
        <td><span class="cell-hit">${hits}</span></td>
        <td>${hitRate}%</td>
        <td>${isAnomaly
          ? '<span class="badge badge-error">⚠ Anomaly</span>'
          : '<span class="badge badge-success">✓ Normal</span>'}</td>
      </tr>`;
  });

  html += `</tbody></table></div></div>`;

  document.getElementById('visual-output').innerHTML = html;
  document.getElementById('stats-section').classList.add('hidden');
}

function renderStepTable(title, pages, steps, faults, hits, numFrames, algo, freqMap) {
  const total = pages.length;
  const hitRate = ((hits / total) * 100).toFixed(1);
  const faultRate = ((faults / total) * 100).toFixed(1);

  const statsSection = document.getElementById('stats-section');
  statsSection.classList.remove('hidden');
  document.getElementById('stats-row').innerHTML = `
    <div class="stat-box">
      <div class="stat-value">${total}</div>
      <div class="stat-label">Total References</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${numFrames}</div>
      <div class="stat-label">Frames</div>
    </div>
    <div class="stat-box">
      <div class="stat-value miss">${faults}</div>
      <div class="stat-label">Page Faults</div>
    </div>
    <div class="stat-box">
      <div class="stat-value hit">${hits}</div>
      <div class="stat-label">Page Hits</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${faultRate}%</div>
      <div class="stat-label">Fault Rate</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${hitRate}%</div>
      <div class="stat-label">Hit Rate</div>
    </div>`;

  let chipsHtml = '<div class="ref-string-display">';
  steps.forEach(s => {
    const cls = s.fault ? 'fault-chip' : 'hit-chip';
    chipsHtml += `<span class="ref-chip ${cls}" title="${s.fault ? 'Page Fault' : 'Page Hit'}">${s.page}</span>`;
  });
  chipsHtml += '</div>';

  const legendHtml = `
    <div class="pr-legend">
      <span class="pr-legend-item">
        <span class="pr-legend-dot" style="background:var(--error-light);border-color:var(--error);"></span> Page Fault (newly loaded)
      </span>
      <span class="pr-legend-item">
        <span class="pr-legend-dot" style="background:var(--accent-light);border-color:var(--accent);"></span> In Frame (hit)
      </span>
      <span class="pr-legend-item">
        <span class="pr-legend-dot" style="background:var(--bg-input);border-color:var(--border);"></span> Empty Frame
      </span>
    </div>`;

  let tableHtml = `
    <div class="step-table-wrapper">
      <table class="step-table">
        <thead>
          <tr>
            <th>Step</th>
            <th>Page</th>
            ${Array.from({ length: numFrames }, (_, i) => `<th>Frame ${i + 1}</th>`).join('')}
            <th>Result</th>
            <th>Replaced</th>
            ${algo === 'mfu' ? '<th>Freq (in frame)</th>' : ''}
          </tr>
        </thead>
        <tbody>`;

  steps.forEach((s, i) => {
    tableHtml += `<tr>
      <td>${i + 1}</td>
      <td><strong>${s.page}</strong></td>`;

    for (let f = 0; f < numFrames; f++) {
      const p = s.frames[f];
      let cls = 'empty';
      if (p !== null) {
        cls = (s.newlyLoaded === p) ? 'newly-loaded' : 'occupied';
      }
      tableHtml += `<td><span class="frame-cell ${cls}">${p !== null ? p : '—'}</span></td>`;
    }

    tableHtml += `
      <td><span class="${s.fault ? 'cell-fault' : 'cell-hit'}">${s.fault ? 'FAULT' : 'HIT'}</span></td>
      <td>${s.replaced !== null ? `<span class="badge badge-warning">${s.replaced}</span>` : '<span class="text-muted">—</span>'}</td>`;

    if (algo === 'mfu' && s.frameFreqs) {
      const nonNull = s.frameFreqs.filter(x => x.page !== null);
      tableHtml += `<td><div class="freq-table">${nonNull.map(x =>
        `<span class="freq-chip"><span class="freq-page">${x.page}</span><span class="freq-count">×${x.freq}</span></span>`
      ).join('')}</div></td>`;
    }

    tableHtml += '</tr>';
  });

  tableHtml += '</tbody></table></div>';

  let mfuExtra = '';
  if (algo === 'mfu' && freqMap) {
    const sorted = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
    mfuExtra = `
      <div style="margin-top:16px;">
        <div class="output-section-title">📊 Final Page Frequencies</div>
        <div class="freq-table">
          ${sorted.map(([pg, cnt]) =>
            `<span class="freq-chip"><span class="freq-page">${pg}</span><span class="freq-count">×${cnt}</span></span>`
          ).join('')}
        </div>
      </div>`;
  }

  document.getElementById('visual-output').innerHTML = `
    <div class="output-section-title">${title}</div>
    ${chipsHtml}
    ${legendHtml}
    ${tableHtml}
    ${mfuExtra}`;
}
