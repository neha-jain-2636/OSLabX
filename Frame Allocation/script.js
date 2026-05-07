// DOM Elements
const totalFramesInput = document.getElementById('total-frames');
const processCountInput = document.getElementById('process-count');
const generateProcessesBtn = document.getElementById('generate-processes');
const processInputsContainer = document.getElementById('process-inputs');
const algorithmSelect = document.getElementById('algorithm-select');
const simulateBtn = document.getElementById('simulate-btn');
const algorithmDescription = document.getElementById('algorithm-description');
const allocationResults = document.getElementById('allocation-results');
const visualization = document.getElementById('visualization');
const performanceMetrics = document.getElementById('performance-metrics');

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);
generateProcessesBtn.addEventListener('click', generateProcessInputs);
simulateBtn.addEventListener('click', runSimulation);
algorithmSelect.addEventListener('change', updateAlgorithmDescription);

// Initial setup
function initializeApp() {
    generateProcessInputs();
    updateAlgorithmDescription();
}

// Generate input fields for processes
function generateProcessInputs() {
    const processCount = parseInt(processCountInput.value);
    const showPriority = algorithmSelect.value === 'priority';

    processInputsContainer.innerHTML = '';

    const header = document.createElement('h2');
    header.textContent = 'Process Settings';
    processInputsContainer.appendChild(header);

    for (let i = 0; i < processCount; i++) {
        const processRow = document.createElement('div');
        processRow.className = 'process-row';

        const nameLabel = document.createElement('label');
        nameLabel.textContent = `Process ${i + 1}:`;
        processRow.appendChild(nameLabel);

        // Size (with up/down)
        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'Size (MB):';
        sizeLabel.style.marginLeft = '10px';
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.min = '1';
        sizeInput.step = '1';
        sizeInput.value = '1';
        sizeInput.id = `process-size-${i}`;
        sizeInput.className = 'process-size';

        processRow.appendChild(sizeLabel);
        processRow.appendChild(sizeInput);

        // Priority (only show for priority algorithm)
        const priorityLabel = document.createElement('label');
        priorityLabel.textContent = 'Priority:';
        priorityLabel.style.marginLeft = '10px';
        const priorityInput = document.createElement('input');
        priorityInput.type = 'number';
        priorityInput.min = '1';
        priorityInput.max = '10';
        priorityInput.step = '1';
        priorityInput.value = '1';
        priorityInput.id = `process-priority-${i}`;
        priorityInput.className = 'process-priority';

        if (!showPriority) {
            priorityLabel.style.display = 'none';
            priorityInput.style.display = 'none';
        }

        processRow.appendChild(priorityLabel);
        processRow.appendChild(priorityInput);

        processInputsContainer.appendChild(processRow);
    }
}

// Update algorithm description and refresh inputs
function updateAlgorithmDescription() {
    const algorithm = algorithmSelect.value;
    let description = '';

    switch (algorithm) {
        case 'equal':
            description = '<strong>Equal Allocation:</strong> Divides the available frames equally among all processes.';
            break;
        case 'proportional':
            description = '<strong>Proportional Allocation:</strong> Allocates frames based on process sizes.';
            break;
        case 'priority':
            description = '<strong>Priority Allocation:</strong> Allocates frames based on priority.';
            break;
        case 'global':
        case 'local':
            description = '<strong>Replacement Policy Simulation:</strong> For visual allocation only.';
            break;
    }

    algorithmDescription.innerHTML = description;
    generateProcessInputs();
}

// Run selected simulation
function runSimulation() {
    const totalFrames = parseInt(totalFramesInput.value);
    const algorithm = algorithmSelect.value;
    const processes = getProcessData();

    let allocations;

    switch (algorithm) {
        case 'equal':
            allocations = equalAllocation(processes, totalFrames);
            break;
        case 'proportional':
            allocations = proportionalAllocation(processes, totalFrames);
            break;
        case 'priority':
            allocations = priorityAllocation(processes, totalFrames);
            break;
        case 'global':
        case 'local':
            allocations = equalAllocation(processes, totalFrames); // Placeholder
            break;
    }

    displayResults(allocations, totalFrames);
    visualizeAllocation(allocations, totalFrames);
    displayBasicMetrics(allocations);
}

// Collect user input
function getProcessData() {
    const processes = [];
    const sizeInputs = document.querySelectorAll('.process-size');
    const priorityInputs = document.querySelectorAll('.process-priority');

    for (let i = 0; i < sizeInputs.length; i++) {
        processes.push({
            id: i + 1,
            name: `Process ${i + 1}`,
            size: parseInt(sizeInputs[i].value),
            priority: parseInt(priorityInputs[i].value) || 1
        });
    }

    return processes;
}

// Algorithms
function equalAllocation(processes, totalFrames) {
    const framesPerProcess = Math.floor(totalFrames / processes.length);
    // Don't distribute the remainder
    return processes.map(p => ({
        process: p,
        frames: framesPerProcess
    }));
}

function proportionalAllocation(processes, totalFrames) {
    const totalSize = processes.reduce((sum, p) => sum + p.size, 0);
    return processes.map(p => ({
        process: p,
        frames: Math.floor((p.size / totalSize) * totalFrames)
    }));
}

function priorityAllocation(processes, totalFrames) {
    const totalPriority = processes.reduce((sum, p) => sum + p.priority, 0);
    return processes.map(p => ({
        process: p,
        frames: Math.floor((p.priority / totalPriority) * totalFrames)
    }));
}

// Results display
function displayResults(allocations, totalFrames) {
    allocationResults.innerHTML = `<h3>Total frames available: ${totalFrames}</h3>`;
    allocations.forEach(a => {
        const div = document.createElement('div');
        div.className = 'process-allocation';
        div.innerHTML = `
            <h3>${a.process.name}</h3>
            <p><strong>Size:</strong> ${a.process.size} MB</p>
            <p><strong>Priority:</strong> ${a.process.priority}</p>
            <p><strong>Frames Allocated:</strong> ${a.frames}</p>
        `;
        allocationResults.appendChild(div);
    });
}

// Frame visualization
function visualizeAllocation(allocations, totalFrames) {
    visualization.innerHTML = '<h3>Frame Allocation Visualization</h3>';
    const container = document.createElement('div');
    container.className = 'frame-container';

    let frameIndex = 0;
    const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2'];

    // Calculate total allocated frames
    const totalAllocated = allocations.reduce((sum, a) => sum + a.frames, 0);

    allocations.forEach((a, idx) => {
        for (let i = 0; i < a.frames; i++) {
            const f = document.createElement('div');
            f.className = 'frame';
            f.style.backgroundColor = colors[idx % colors.length];
            f.style.color = getContrastColor(colors[idx % colors.length]);
            f.textContent = `P${a.process.id}`;
            f.title = `Frame ${frameIndex + 1}`;
            container.appendChild(f);
            frameIndex++;
        }
    });

    // Add remaining free frames
    const freeFrames = totalFrames - totalAllocated;
    for (let i = 0; i < freeFrames; i++) {
        const f = document.createElement('div');
        f.className = 'frame';
        f.style.backgroundColor = '#E9ECEF';
        f.textContent = 'Free';
        container.appendChild(f);
    }

    visualization.appendChild(container);
}

function getContrastColor(hex) {
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.5 ? '#000000' : '#FFFFFF';
}

// Metrics (only basic now)
function displayBasicMetrics(allocations) {
    performanceMetrics.innerHTML = '<h2>Basic Metrics</h2>';

    const table = document.createElement('table');
    table.className = 'metrics-table';

    table.innerHTML = `
        <thead>
            <tr>
                <th>Process</th>
                <th>Size (MB)</th>
                <th>Priority</th>
                <th>Frames</th>
            </tr>
        </thead>
        <tbody>
            ${allocations.map(a => `
                <tr>
                    <td>${a.process.name}</td>
                    <td>${a.process.size}</td>
                    <td>${a.process.priority}</td>
                    <td>${a.frames}</td>
                </tr>
            `).join('')}
        </tbody>
    `;

    performanceMetrics.appendChild(table);
}
