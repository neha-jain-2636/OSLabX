document.addEventListener('DOMContentLoaded', function() {
    // Initial state
    let processes = [
      { id: 1, name: "P1", arrivalTime: 0, burstTime: 10, priority: 2, color: "#00e5ff", remainingTime: 10 },
      { id: 2, name: "P2", arrivalTime: 1, burstTime: 4,  priority: 1, color: "#00ffaa", remainingTime: 4  },
      { id: 3, name: "P3", arrivalTime: 2, burstTime: 2,  priority: 3, color: "#9b6dff", remainingTime: 2  },
      { id: 4, name: "P4", arrivalTime: 3, burstTime: 6,  priority: 4, color: "#ffbe0b", remainingTime: 6  },
    ];

    let algorithm = "fcfs";
    let isPreemptive = false;
    let timeQuantum = 2;
    let currentTime = 0;
    let isRunning = false;
    let speed = 1000;
    let ganttChart = [];
    let completionInfo = [];
    let simulationComplete = false;
    let queue = [];
    let currentProcess = null;
    let quantumProgress = 0;
    let simulationTimer;
    timeQuantum = timeQuantum - 1;

    const colors = [
      "#00e5ff", "#00ffaa", "#9b6dff", "#ffbe0b",
      "#ff3d6b", "#ff9f43", "#54a0ff", "#5f27cd",
      "#00d2d3", "#ff6b6b", "#48dbfb", "#1dd1a1"
    ];

    // DOM elements
    const algorithmSelect       = document.getElementById('algorithm');
    const preemptiveContainer   = document.getElementById('preemptive-container');
    const preemptiveSelect      = document.getElementById('preemptive');
    const timeQuantumContainer  = document.getElementById('time-quantum-container');
    const timeQuantumInput      = document.getElementById('time-quantum');
    const speedInput            = document.getElementById('speed');
    const speedValue            = document.getElementById('speed-value');
    const processNameInput      = document.getElementById('process-name');
    const arrivalTimeInput      = document.getElementById('arrival-time');
    const burstTimeInput        = document.getElementById('burst-time');
    const priorityInput         = document.getElementById('priority');
    const addProcessBtn         = document.getElementById('add-process-btn');
    const startBtn              = document.getElementById('start-btn');
    const stopBtn               = document.getElementById('stop-btn');
    const resetBtn              = document.getElementById('reset-btn');
    const processesTable        = document.getElementById('processes-tbody');
    const ganttChartEl          = document.getElementById('gantt-chart');
    const currentTimeEl         = document.getElementById('current-time');
    const currentProcessInfo    = document.getElementById('current-process-info');
    const queueDisplay          = document.getElementById('queue-display');
    const outputCard            = document.getElementById('output-card');
    const outputTable           = document.getElementById('output-tbody');

    // Algorithm change handler
    algorithmSelect.addEventListener('change', function() {
      algorithm = this.value;
      if (algorithm === 'fcfs' || algorithm === 'rr') {
        preemptiveContainer.style.display = 'none';
      } else {
        preemptiveContainer.style.display = 'block';
      }
      timeQuantumContainer.style.display = (algorithm === 'rr') ? 'block' : 'none';
    });

    preemptiveSelect.addEventListener('change', function() {
      isPreemptive = this.value === 'true';
    });

    timeQuantumInput.addEventListener('change', function() {
      timeQuantum = Math.max(0, parseInt(this.value || 1) - 1);
      if (timeQuantum < 0) { timeQuantum = 0; this.value = 1; }
    });

    speedInput.addEventListener('input', function() {
      speed = parseInt(this.value);
      speedValue.textContent = speed + ' ms';
    });

    // Add process
    addProcessBtn.addEventListener('click', function() {
      const name        = processNameInput.value.trim();
      const arrivalTime = parseInt(arrivalTimeInput.value) || 0;
      const burstTime   = parseInt(burstTimeInput.value) || 1;
      const priority    = parseInt(priorityInput.value) || 1;

      if (name && burstTime > 0) {
        const newId = processes.length > 0 ? Math.max(...processes.map(p => p.id)) + 1 : 1;
        const processColor = colors[newId % colors.length];
        processes.push({ id: newId, name, arrivalTime, burstTime, priority, color: processColor, remainingTime: burstTime });
        processNameInput.value = '';
        updateProcessesTable();
      }
    });

    startBtn.addEventListener('click', function() {
      resetSimulation();
      isRunning = true;
      updateButtons();
      runSimulation();
    });

    stopBtn.addEventListener('click', function() {
      isRunning = false;
      updateButtons();
      clearTimeout(simulationTimer);
    });

    resetBtn.addEventListener('click', function() {
      resetSimulation();
      updateButtons();
    });

    function resetSimulation() {
      currentTime = 0;
      ganttChart = [];
      isRunning = false;
      simulationComplete = false;
      completionInfo = [];
      currentProcess = null;
      quantumProgress = 0;
      queue = [];
      clearTimeout(simulationTimer);
      processes = processes.map(p => ({ ...p, remainingTime: p.burstTime }));
      updateCurrentTime();
      updateProcessesTable();
      updateGanttChart();
      updateCurrentProcessInfo();
      updateQueueDisplay();
      updateOutputTable();
    }

    function updateButtons() {
      startBtn.disabled = isRunning || processes.length === 0;
      stopBtn.disabled  = !isRunning;
    }

    function removeProcess(id) {
      processes = processes.filter(p => p.id !== id);
      updateProcessesTable();
    }

    function updateProcessesTable() {
      processesTable.innerHTML = '';
      processes.forEach(process => {
        const row = document.createElement('tr');

        // Name + colour dot
        const nameCell = document.createElement('td');
        const nameDiv  = document.createElement('div');
        nameDiv.style.cssText = 'display:flex;align-items:center;';
        const dot = document.createElement('div');
        dot.classList.add('process-color');
        dot.style.backgroundColor = process.color;
        dot.style.color = process.color;
        nameDiv.appendChild(dot);
        nameDiv.appendChild(document.createTextNode(process.name));
        nameCell.appendChild(nameDiv);
        row.appendChild(nameCell);

        const arrCell = document.createElement('td');
        arrCell.textContent = process.arrivalTime;
        row.appendChild(arrCell);

        const burstCell = document.createElement('td');
        burstCell.textContent = process.burstTime;
        row.appendChild(burstCell);

        const prioCell = document.createElement('td');
        prioCell.textContent = process.priority;
        row.appendChild(prioCell);

        // Remaining time with progress bar
        const remCell = document.createElement('td');
        const pbar = document.createElement('div');
        pbar.classList.add('progress-bar');
        const pfill = document.createElement('div');
        pfill.classList.add('progress-bar-fill');
        const pct = process.burstTime > 0
          ? ((process.burstTime - process.remainingTime) / process.burstTime * 100)
          : 100;
        pfill.style.width = `${pct}%`;
        pfill.style.backgroundColor = process.color;
        const ptxt = document.createElement('div');
        ptxt.classList.add('progress-text');
        ptxt.textContent = `${process.remainingTime} / ${process.burstTime}`;
        pbar.appendChild(pfill);
        remCell.appendChild(pbar);
        remCell.appendChild(ptxt);
        row.appendChild(remCell);

        // Actions
        const actCell = document.createElement('td');
        const removeBtn = document.createElement('button');
        removeBtn.classList.add('remove-btn');
        removeBtn.textContent = 'Remove';
        removeBtn.disabled = isRunning;
        removeBtn.addEventListener('click', () => removeProcess(process.id));
        actCell.appendChild(removeBtn);
        row.appendChild(actCell);

        processesTable.appendChild(row);
      });
      updateButtons();
    }

    function updateGanttChart() {
      ganttChartEl.innerHTML = '';

      if (ganttChart.length === 0) {
        const empty = document.createElement('div');
        empty.classList.add('text-center', 'text-gray');
        empty.textContent = 'Gantt chart will appear here when simulation starts';
        ganttChartEl.appendChild(empty);
        return;
      }

      ganttChart.forEach((item, index) => {
        const el = document.createElement('div');
        el.classList.add('gantt-item');
        el.style.backgroundColor = item.color;
        el.style.flex = (item.endTime - item.startTime).toString();

        const pName = document.createElement('div');
        pName.classList.add('gantt-process-name');
        pName.textContent = item.processName;
        pName.style.color = item.processId === "idle" ? "#555" : getContrastColor(item.color);

        const tRange = document.createElement('div');
        tRange.classList.add('gantt-time');
        tRange.textContent = `${item.startTime}–${item.endTime}`;
        tRange.style.color = item.processId === "idle" ? "#555" : getContrastColor(item.color);

        el.appendChild(pName);
        el.appendChild(tRange);

        // Start time tick
        const sm = document.createElement('div');
        sm.classList.add('time-marker');
        sm.style.left = '0';
        const sl = document.createElement('div');
        sl.classList.add('time-marker-label');
        sl.textContent = item.startTime;
        sl.style.left = '0';
        el.appendChild(sm);
        el.appendChild(sl);

        if (index === ganttChart.length - 1) {
          const em = document.createElement('div');
          em.classList.add('time-marker');
          em.style.right = '0';
          const el2 = document.createElement('div');
          el2.classList.add('time-marker-label');
          el2.textContent = item.endTime;
          el2.style.right = '0';
          el.appendChild(em);
          el.appendChild(el2);
        }

        ganttChartEl.appendChild(el);
      });
    }

    function updateCurrentTime() {
      currentTimeEl.textContent = currentTime;
    }

    function updateCurrentProcessInfo() {
      currentProcessInfo.innerHTML = '';
      if (!currentProcess) return;

      const div = document.createElement('div');
      div.classList.add('current-process-info');

      const lbl = document.createElement('div');
      lbl.classList.add('cp-label');
      lbl.textContent = 'Running:';

      const nm = document.createElement('div');
      nm.classList.add('cp-name');
      nm.style.color = currentProcess.color;
      nm.textContent = currentProcess.name;

      div.appendChild(lbl);
      div.appendChild(nm);

      if (algorithm === 'rr') {
        const qd = document.createElement('div');
        qd.style.cssText = 'font-size:11px;color:var(--text-muted);font-family:var(--font-mono);margin-left:auto;';
        qd.textContent = `Quantum: ${quantumProgress + 1} / ${timeQuantum + 1}`;
        div.appendChild(qd);

        const qbar = document.createElement('div');
        qbar.style.cssText = 'width:100%;margin-top:8px;';
        const qtrack = document.createElement('div');
        qtrack.classList.add('quantum-bar');
        const qfill = document.createElement('div');
        qfill.classList.add('quantum-bar-fill');
        qfill.style.width = `${(quantumProgress + 1) / (timeQuantum + 1) * 100}%`;
        qtrack.appendChild(qfill);
        qbar.appendChild(qtrack);
        currentProcessInfo.appendChild(div);
        currentProcessInfo.appendChild(qbar);
        return;
      }

      currentProcessInfo.appendChild(div);
    }

    function updateQueueDisplay() {
      queueDisplay.innerHTML = '';
      if (algorithm !== 'rr' || queue.length === 0) return;

      const wrap = document.createElement('div');
      wrap.classList.add('queue-display');
      const title = document.createElement('div');
      title.classList.add('queue-title');
      title.textContent = 'Ready Queue';
      wrap.appendChild(title);

      const items = document.createElement('div');
      items.classList.add('queue-items');
      queue.forEach(p => {
        const qi = document.createElement('div');
        qi.classList.add('queue-item');
        qi.style.backgroundColor = p.color + '22';
        qi.style.color = p.color;
        qi.style.borderColor = p.color + '55';
        qi.textContent = `${p.name} (${p.remainingTime})`;
        items.appendChild(qi);
      });
      wrap.appendChild(items);
      queueDisplay.appendChild(wrap);
    }

    function updateOutputTable() {
      outputTable.innerHTML = '';
      if (completionInfo.length === 0) { outputCard.style.display = 'none'; return; }
      outputCard.style.display = 'block';

      completionInfo.forEach(info => {
        const row = document.createElement('tr');

        const nc = document.createElement('td');
        const nd = document.createElement('div');
        nd.style.cssText = 'display:flex;align-items:center;';
        const dot = document.createElement('div');
        dot.classList.add('process-color');
        const proc = processes.find(p => p.id === info.id);
        dot.style.backgroundColor = proc ? proc.color : '#888';
        dot.style.color = proc ? proc.color : '#888';
        nd.appendChild(dot);
        nd.appendChild(document.createTextNode(info.name));
        nc.appendChild(nd);
        row.appendChild(nc);

        const cc = document.createElement('td'); cc.textContent = info.completionTime; row.appendChild(cc);
        const tc = document.createElement('td'); tc.textContent = info.turnaroundTime; row.appendChild(tc);
        const wc = document.createElement('td'); wc.textContent = info.waitingTime;    row.appendChild(wc);

        outputTable.appendChild(row);
      });

      // Average row
      const avgs = calculateAverages();
      const avgRow = document.createElement('tr');
      const aLbl = document.createElement('td'); aLbl.textContent = 'Average';    avgRow.appendChild(aLbl);
      const aE   = document.createElement('td'); aE.textContent   = '—';          avgRow.appendChild(aE);
      const aT   = document.createElement('td'); aT.textContent   = avgs.avgTurnaround; avgRow.appendChild(aT);
      const aW   = document.createElement('td'); aW.textContent   = avgs.avgWaiting;    avgRow.appendChild(aW);
      outputTable.appendChild(avgRow);
    }

    function calculateAverages() {
      if (completionInfo.length === 0) return { avgTurnaround: 0, avgWaiting: 0 };
      const tt = completionInfo.reduce((s, p) => s + p.turnaroundTime, 0);
      const tw = completionInfo.reduce((s, p) => s + p.waitingTime, 0);
      return {
        avgTurnaround: (tt / completionInfo.length).toFixed(2),
        avgWaiting:    (tw / completionInfo.length).toFixed(2)
      };
    }

    function getContrastColor(hex) {
      const r = parseInt(hex.substr(1, 2), 16);
      const g = parseInt(hex.substr(3, 2), 16);
      const b = parseInt(hex.substr(5, 2), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#000' : '#fff';
    }

    // ── Scheduling algorithms ──────────────────────────────────────────────

    function handleFCFS(arrived) {
      if (currentProcess && currentProcess.remainingTime > 0) return currentProcess;
      return arrived.sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
    }

    function handleSJF(arrived, preemptive) {
      if (!preemptive && currentProcess && currentProcess.remainingTime > 0) return currentProcess;
      return arrived.sort((a, b) => a.remainingTime - b.remainingTime)[0];
    }

    // Longest Job First — mirrors SJF but picks the process with the MOST remaining time
    function handleLJF(arrived, preemptive) {
      if (!preemptive && currentProcess && currentProcess.remainingTime > 0) return currentProcess;
      return arrived.sort((a, b) => b.remainingTime - a.remainingTime)[0];
    }

    function handlePriority(arrived, preemptive) {
      if (!preemptive && currentProcess && currentProcess.remainingTime > 0) return currentProcess;
      return arrived.sort((a, b) => a.priority - b.priority)[0];
    }

    function handleRoundRobin(arrived) {
      arrived.forEach(p => {
        if (!queue.includes(p) && p !== currentProcess && p.remainingTime > 0) {
          queue.push(p);
        }
      });

      if (!currentProcess || quantumProgress > timeQuantum || currentProcess.remainingTime === 0) {
        quantumProgress = 0;
        if (currentProcess && currentProcess.remainingTime > 0) queue.push(currentProcess);
        const next = queue.shift();
        updateQueueDisplay();
        return next;
      } else {
        quantumProgress++;
        updateQueueDisplay();
        return currentProcess;
      }
    }

    // ── Run simulation ─────────────────────────────────────────────────────

    function runSimulation() {
      if (!isRunning) return;

      if (processes.every(p => p.remainingTime === 0)) {
        isRunning = false;
        simulationComplete = true;
        updateButtons();
        updateOutputTable();
        return;
      }

      const arrived = processes.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);

      if (arrived.length === 0) {
        currentTime++;
        updateCurrentTime();
        const last = ganttChart.length > 0 ? ganttChart[ganttChart.length - 1] : null;
        if (last && last.processId === "idle") {
          last.endTime = currentTime;
        } else {
          ganttChart.push({ processId: "idle", processName: "Idle", startTime: currentTime - 1, endTime: currentTime, color: "#1c2029" });
        }
        updateGanttChart();
        simulationTimer = setTimeout(runSimulation, speed);
        return;
      }

      let next;
      switch (algorithm) {
        case 'fcfs':     next = handleFCFS(arrived);                  break;
        case 'sjf':      next = handleSJF(arrived, isPreemptive);     break;
        case 'ljf':      next = handleLJF(arrived, isPreemptive);     break;
        case 'priority': next = handlePriority(arrived, isPreemptive); break;
        case 'rr':       next = handleRoundRobin(arrived);            break;
        default:         next = handleFCFS(arrived);
      }

      if (next) executeProcess(next);

      simulationTimer = setTimeout(runSimulation, speed);
    }

    function executeProcess(process) {
      if (!process) return;

      if (currentProcess !== process) {
        const last = ganttChart.length > 0 ? ganttChart[ganttChart.length - 1] : null;
        if (last && last.processId === process.id) {
          last.endTime = currentTime + 1;
        } else {
          ganttChart.push({ processId: process.id, processName: process.name, startTime: currentTime, endTime: currentTime + 1, color: process.color });
        }
      } else {
        const last = ganttChart[ganttChart.length - 1];
        if (last) last.endTime = currentTime + 1;
      }

      currentProcess = process;
      process.remainingTime--;
      currentTime++;

      if (process.remainingTime === 0) {
        completionInfo.push({
          id: process.id,
          name: process.name,
          completionTime: currentTime,
          turnaroundTime: currentTime - process.arrivalTime,
          waitingTime:    currentTime - process.arrivalTime - process.burstTime
        });
        if (algorithm !== 'rr') currentProcess = null;
      }

      updateCurrentTime();
      updateProcessesTable();
      updateGanttChart();
      updateCurrentProcessInfo();
    }

    // Init
    updateProcessesTable();
    updateGanttChart();
});