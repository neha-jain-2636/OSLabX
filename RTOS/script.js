// To handle navigation 
document.addEventListener('DOMContentLoaded', function() {
    const theoryPage = document.getElementById('theory-page');
    const simulationPage = document.getElementById('simulation-page');
    const simulateEdfBtn = document.getElementById('simulate-edf');
    const simulateRmsBtn = document.getElementById('simulate-rms');
    const backToTheoryBtn = document.getElementById('back-to-theory');
    const selectEdfBtn = document.getElementById('select-edf');
    const selectRmsBtn = document.getElementById('select-rms');
    
    // Show EDF simulation
    simulateEdfBtn.addEventListener('click', function() {
        theoryPage.classList.remove('active');
        theoryPage.classList.add('hidden');
        simulationPage.classList.remove('hidden');
        simulationPage.classList.add('active');
        selectEdfBtn.classList.add('active');
        selectRmsBtn.classList.remove('active');
    });
    
    // Show RMS simulation
    simulateRmsBtn.addEventListener('click', function() {
        theoryPage.classList.remove('active');
        theoryPage.classList.add('hidden');
        simulationPage.classList.remove('hidden');
        simulationPage.classList.add('active');
        selectRmsBtn.classList.add('active');
        selectEdfBtn.classList.remove('active');
    });
    
    // Back to theory
    backToTheoryBtn.addEventListener('click', function() {
        simulationPage.classList.remove('active');
        simulationPage.classList.add('hidden');
        theoryPage.classList.remove('hidden');
        theoryPage.classList.add('active');
    });
});

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const selectEdfBtn = document.getElementById('select-edf');
    const selectRmsBtn = document.getElementById('select-rms');
    const taskInputs = document.getElementById('task-inputs');
    const addTaskBtn = document.getElementById('add-task');
    const runSimulationBtn = document.getElementById('run-simulation');
    const resetSimulationBtn = document.getElementById('reset-simulation');
    const simulationDuration = document.getElementById('simulation-duration');
    const utilization = document.getElementById('utilization');
    const schedulabilityTest = document.getElementById('schedulability-test');
    const ganttChart = document.getElementById('gantt-chart');
    const timeline = document.getElementById('timeline');
    const stats = document.getElementById('stats');
    
    // (default: EDF)
    let currentAlgorithm = 'EDF';
    
    // Algorithm selection
    selectEdfBtn.addEventListener('click', function() {
        currentAlgorithm = 'EDF';
        selectEdfBtn.classList.add('active');
        selectRmsBtn.classList.remove('active');
        toggleDeadlineInputs(true);
    });
    
    selectRmsBtn.addEventListener('click', function() {
        currentAlgorithm = 'RMS';
        selectRmsBtn.classList.add('active');
        selectEdfBtn.classList.remove('active');
        toggleDeadlineInputs(false);
    });
    
    // Show/hide deadline inputs based on algorithm
    function toggleDeadlineInputs(show) {
        const deadlineInputs = document.querySelectorAll('.deadline-input');
        deadlineInputs.forEach(input => {
            if (show) {
                input.style.display = 'flex';
            } else {
                input.style.display = 'none';
            }
        });
    }
    
    // Initialize with EDF selected
    toggleDeadlineInputs(true);
    
    // Task management
    addTaskBtn.addEventListener('click', function() {
        const taskRows = taskInputs.querySelectorAll('.task-row');
        const newTaskId = taskRows.length + 1;
        
        const taskRow = document.createElement('div');
        taskRow.className = 'task-row';
        taskRow.innerHTML = `
            <div class="input-group">
                <label>Task ID:</label>
                <input type="text" value="Task ${newTaskId}" class="task-id" disabled>
            </div>
            <div class="input-group">
                <label>Arrival Time (A):</label>
                <input type="number" class="arrival-time" min="0" value="0">
            </div>
            <div class="input-group">
                <label>Execution Time (C):</label>
                <input type="number" class="execution-time" min="1" value="1">
            </div>
            <div class="input-group">
                <label>Period (T):</label>
                <input type="number" class="period" min="1" value="${5 * newTaskId}">
            </div>
            <div class="input-group deadline-input" ${currentAlgorithm === 'RMS' ? 'style="display: none;"' : ''}>
                <label>Deadline (D):</label>
                <input type="number" class="deadline" min="1" value="${5 * newTaskId}">
            </div>
            <button class="remove-task-btn">Remove</button>
        `;
        
        taskInputs.appendChild(taskRow);
        
        // Add event listener to remove button
        taskRow.querySelector('.remove-task-btn').addEventListener('click', function() {
            if (taskInputs.querySelectorAll('.task-row').length > 1) {
                taskInputs.removeChild(taskRow);
                updateTaskIds();
            } else {
                alert("You must have at least one task.");
            }
        });
        
        // Add event listeners to update deadline when period changes in RMS mode
        const periodInput = taskRow.querySelector('.period');
        const deadlineInput = taskRow.querySelector('.deadline');
        
        periodInput.addEventListener('change', function() {
            if (currentAlgorithm === 'RMS') {
                deadlineInput.value = this.value;
            }
        });
    });
    
    // Add event listeners to initial remove buttons
    document.querySelectorAll('.remove-task-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const taskRow = this.parentNode;
            if (taskInputs.querySelectorAll('.task-row').length > 1) {
                taskInputs.removeChild(taskRow);
                updateTaskIds();
            } else {
                alert("You must have at least one task.");
            }
        });
    });
    
    // Add event listeners to update deadline when period changes in RMS mode for initial tasks
    document.querySelectorAll('.task-row').forEach(row => {
        const periodInput = row.querySelector('.period');
        const deadlineInput = row.querySelector('.deadline');
        
        periodInput.addEventListener('change', function() {
            if (currentAlgorithm === 'RMS') {
                deadlineInput.value = this.value;
            }
        });
    });
    
    // Update task IDs after removing a task
    function updateTaskIds() {
        const taskRows = taskInputs.querySelectorAll('.task-row');
        taskRows.forEach((row, index) => {
            row.querySelector('.task-id').value = `Task ${index + 1}`;
        });
    }
    
    // Run simulation
    runSimulationBtn.addEventListener('click', function() {
        if (currentAlgorithm === 'EDF') {
            runEDFSimulation();
        } else {
            runRMSSimulation();
        }
    });
    
    resetSimulationBtn.addEventListener('click', resetSimulation);
    
    // EDF Simulation
    function runEDFSimulation() {
        // Get task data
        const tasks = [];
        const taskRows = taskInputs.querySelectorAll('.task-row');
        
        taskRows.forEach((row, index) => {
            const arrivalTime = parseInt(row.querySelector('.arrival-time').value);
            const executionTime = parseInt(row.querySelector('.execution-time').value);
            const period = parseInt(row.querySelector('.period').value);
            const deadline = parseInt(row.querySelector('.deadline').value);
            
            tasks.push({
                id: index + 1,
                name: `Task ${index + 1}`,
                arrivalTime,
                executionTime,
                period,
                deadline,
                remaining: executionTime,
                nextRelease: arrivalTime,
                nextDeadline: arrivalTime + deadline,
                releases: [arrivalTime],
                deadlines: [arrivalTime + deadline],
                completions: [],
                responseTime: [],
                missedDeadlines: 0,
                instances: []
            });
        });
        
        // Validate input
        for (let task of tasks) {
            if (task.executionTime <= 0 || task.period <= 0 || task.deadline <= 0) {
                alert("All execution times, periods, and deadlines must be positive integers.");
                return;
            }
            if (task.executionTime > task.deadline) {
                alert(`Task ${task.id} has execution time greater than deadline, which makes it unschedulable.`);
            }
        }
        
        // Calculate utilization
        let utilizationValue = 0;
        tasks.forEach(task => {
            utilizationValue += task.executionTime / task.period;
        });
        utilizationValue = Math.min(utilizationValue, 1);
        
        // Update utilization display
        utilization.textContent = `${(utilizationValue * 100).toFixed(2)}%`;
        
        // Check schedulability
        if (utilizationValue <= 1) {
            schedulabilityTest.textContent = "Schedulable according to EDF utilization test";
            schedulabilityTest.className = "schedulable";
        } else {
            schedulabilityTest.textContent = "Not schedulable according to EDF utilization test";
            schedulabilityTest.className = "not-schedulable";
        }
        
        // Run simulation
        const duration = parseInt(simulationDuration.value);
        const schedule = simulateEDF(tasks, duration);
        
        // Display results
        displayGanttChart(schedule, tasks, duration);
        displayStats(tasks);
    }
    
    function simulateEDF(tasks, duration) {
        const schedule = Array(duration).fill(null);
        const activeInstances = [];
    
        // Initialize tasks
        tasks.forEach(task => {
            task.instances = [];
            task.releases = [];
            task.deadlines = [];
            task.completions = [];
            task.responseTime = [];
            task.missedDeadlines = 0;
    
            // Only add initial release if within simulation duration
            if (task.arrivalTime < duration) {
                task.releases.push(task.arrivalTime);
                task.deadlines.push(task.arrivalTime + task.deadline);
                task.instances.push({
                    releaseTime: task.arrivalTime,
                    deadline: task.arrivalTime + task.deadline,
                    completed: false,
                    responseTime: null
                });
            }
        });
    
        for (let time = 0; time < duration; time++) {
            // Check for new task releases
            tasks.forEach(task => {
                // Initial release at arrival time
                if (time === task.arrivalTime) {
                    activeInstances.push({
                        taskId: task.id,
                        releaseTime: time,
                        deadline: time + task.deadline,
                        remainingTime: task.executionTime
                    });
                }
                
                // Periodic releases after arrival time
                if (time > task.arrivalTime && 
                    (time - task.arrivalTime) % task.period === 0 &&
                    time < duration) {
                    
                    // Check if previous instance of this task is completed
                    const lastInstance = task.instances[task.instances.length - 1];
                    if (lastInstance.completed || time >= lastInstance.deadline) {
                        task.releases.push(time);
                        task.deadlines.push(time + task.deadline);
                        activeInstances.push({
                            taskId: task.id,
                            releaseTime: time,
                            deadline: time + task.deadline,
                            remainingTime: task.executionTime
                        });
                        task.instances.push({
                            releaseTime: time,
                            deadline: time + task.deadline,
                            completed: false,
                            responseTime: null
                        });
                    }
                }
            });
    
            // Find task with earliest deadline among released tasks
            let selectedInstance = null;
            let earliestDeadline = Infinity;
    
            activeInstances.forEach(instance => {
                // Only consider instances that have been released and have remaining work
                if (instance.remainingTime > 0 && instance.releaseTime <= time) {
                    if (instance.deadline < earliestDeadline) {
                        earliestDeadline = instance.deadline;
                        selectedInstance = instance;
                    }
                }
            });
    
            // Execute selected task
            if (selectedInstance !== null) {
                const taskId = selectedInstance.taskId;
                schedule[time] = taskId;
                selectedInstance.remainingTime--;
    
                if (selectedInstance.remainingTime === 0) {
                    const completionTime = time + 1;
                    const responseTime = completionTime - selectedInstance.releaseTime;
                    const task = tasks.find(t => t.id === taskId);
                    task.responseTime.push(responseTime);
                    task.completions.push(completionTime);
    
                    const instanceIndex = task.instances.findIndex(inst =>
                        inst.releaseTime === selectedInstance.releaseTime &&
                        inst.deadline === selectedInstance.deadline
                    );
                    if (instanceIndex !== -1) {
                        task.instances[instanceIndex].completed = true;
                        task.instances[instanceIndex].responseTime = responseTime;
                    }
                }
            }
    
            // Check for missed deadlines at the end of the time unit
            const deadlineTime = time + 1;
            tasks.forEach(task => {
                const deadlineIndex = task.deadlines.indexOf(deadlineTime);
                if (deadlineIndex !== -1) {
                    const instanceIndex = task.instances.findIndex(inst =>
                        inst.deadline === deadlineTime &&
                        !inst.completed &&
                        inst.releaseTime <= time
                    );
                    if (instanceIndex !== -1) {
                        task.missedDeadlines++;
    
                        // Remove the missed instance from active instances
                        const activeIndex = activeInstances.findIndex(inst =>
                            inst.taskId === task.id &&
                            inst.releaseTime === task.instances[instanceIndex].releaseTime &&
                            inst.deadline === deadlineTime
                        );
                        if (activeIndex !== -1) {
                            activeInstances.splice(activeIndex, 1);
                        }
                    }
                }
            });
    
            // Clean up completed instances
            activeInstances.forEach((instance, index, array) => {
                if (instance.remainingTime <= 0) {
                    array.splice(index, 1);
                }
            });
        }
    
        return schedule;
    }

    // RMS Simulation
    function runRMSSimulation() {
        // Get task data
        const tasks = [];
        const taskRows = taskInputs.querySelectorAll('.task-row');
        
        taskRows.forEach((row, index) => {
            const arrivalTime = parseInt(row.querySelector('.arrival-time').value);
            const executionTime = parseInt(row.querySelector('.execution-time').value);
            const period = parseInt(row.querySelector('.period').value);
            
            tasks.push({
                id: index + 1,
                name: `Task ${index + 1}`,
                arrivalTime,
                executionTime,
                period,
                deadline: period, // In RMS, deadline = period
                remaining: executionTime,
                nextRelease: arrivalTime,
                nextDeadline: arrivalTime + period,
                releases: [],
                deadlines: [],
                completions: [],
                responseTime: [],
                missedDeadlines: 0,
                instances: []
            });
        });
        
        // Validate input
        for (let task of tasks) {
            if (task.executionTime <= 0 || task.period <= 0) {
                alert("All execution times and periods must be positive integers.");
                return;
            }
        }
        
        // Sort tasks by period (rate-monotonic priority assignment)
        tasks.sort((a, b) => a.period - b.period);
        
        // Calculate utilization
        let utilizationValue = 0;
        tasks.forEach(task => {
            utilizationValue += task.executionTime / task.period;
        });
        utilizationValue = Math.min(utilizationValue, 1);
        
        // Update utilization display
        utilization.textContent = `${(utilizationValue * 100).toFixed(2)}%`;
        
        // Check schedulability using RMS bound
        const n = tasks.length;
        const rmsBound = n * (Math.pow(2, 1/n) - 1);
        
        if (utilizationValue <= rmsBound) {
            schedulabilityTest.textContent = `Schedulable according to RMS utilization test (bound: ${rmsBound.toFixed(3)})`;
            schedulabilityTest.className = "schedulable";
        } else {
            schedulabilityTest.textContent = `Not guaranteed schedulable by RMS utilization test (bound: ${rmsBound.toFixed(3)})`;
            schedulabilityTest.className = "not-schedulable";
        }
        
        // Run simulation
        const duration = parseInt(simulationDuration.value);
        const schedule = simulateRMS(tasks, duration);
        
        // Display results
        displayGanttChart(schedule, tasks, duration);
        displayStats(tasks);
    }
    
    function simulateRMS(tasks, duration) {
        const schedule = Array(duration).fill(null);
        const activeInstances = [];
    
        // First sort tasks by period (shorter period first = higher priority)
        tasks.sort((a, b) => a.period - b.period);
    
        // Initialize tasks
        tasks.forEach(task => {
            task.instances = [];
            task.releases = [];
            task.deadlines = [];
            task.completions = [];
            task.responseTime = [];
            task.missedDeadlines = 0;
    
            if (task.arrivalTime < duration) {
                task.releases.push(task.arrivalTime);
                task.deadlines.push(task.arrivalTime + task.deadline);
                task.instances.push({
                    releaseTime: task.arrivalTime,
                    deadline: task.arrivalTime + task.deadline,
                    completed: false,
                    responseTime: null
                });
            }
        });
    
        for (let time = 0; time < duration; time++) {
            // Check for new task releases
            tasks.forEach(task => {
                // Initial release at arrival time
                if (time === task.arrivalTime) {
                    activeInstances.push({
                        taskId: task.id,
                        releaseTime: time,
                        deadline: time + task.deadline,
                        remainingTime: task.executionTime,
                        period: task.period  // The period determines priority in RMS
                    });
                }
                
                // Periodic releases after arrival time
                if (time > task.arrivalTime &&
                    (time - task.arrivalTime) % task.period === 0) {
                    
                    const lastInstance = task.instances[task.instances.length - 1];
                    if (lastInstance.completed || time >= lastInstance.deadline) {
                        task.releases.push(time);
                        task.deadlines.push(time + task.deadline);
                        activeInstances.push({
                            taskId: task.id,
                            releaseTime: time,
                            deadline: time + task.deadline,
                            remainingTime: task.executionTime,
                            period: task.period
                        });
                        task.instances.push({
                            releaseTime: time,
                            deadline: time + task.deadline,
                            completed: false,
                            responseTime: null
                        });
                    }
                }
            });
    
            // Filter available tasks (arrived and not completed)
            const availableTasks = activeInstances.filter(instance => 
                instance.releaseTime <= time && 
                instance.remainingTime > 0
            );
    
            if (availableTasks.length > 0) {
                // Sort by period (shorter period = higher priority in RMS)
                availableTasks.sort((a, b) => a.period - b.period);
    
                const taskToRun = availableTasks[0];
                schedule[time] = taskToRun.taskId;
                taskToRun.remainingTime--;
    
                // Handle task completion
                if (taskToRun.remainingTime === 0) {
                    const task = tasks.find(t => t.id === taskToRun.taskId);
                    const responseTime = (time + 1) - taskToRun.releaseTime;
                    task.responseTime.push(responseTime);
                    task.completions.push(time + 1);
                    
                    const instance = task.instances.find(
                        inst => inst.releaseTime === taskToRun.releaseTime
                    );
                    if (instance) {
                        instance.completed = true;
                        instance.responseTime = responseTime;
                    }
                }
            }
    
            // Check for missed deadlines
            const deadlineTime = time + 1;
            tasks.forEach(task => {
                if (task.deadlines.includes(deadlineTime)) {
                    const instance = task.instances.find(
                        inst => inst.deadline === deadlineTime && !inst.completed
                    );
                    if (instance) {
                        task.missedDeadlines++;
                        const index = activeInstances.findIndex(
                            inst => inst.taskId === task.id && 
                                   inst.releaseTime === instance.releaseTime
                        );
                        if (index !== -1) activeInstances.splice(index, 1);
                    }
                }
            });
    
            // Clean up completed instances
            for (let i = activeInstances.length - 1; i >= 0; i--) {
                if (activeInstances[i].remainingTime <= 0) {
                    activeInstances.splice(i, 1);
                }
            }
        }
    
        return schedule;
    }

    function resetSimulation() {
        utilization.textContent = "0%";
        schedulabilityTest.textContent = "";
        schedulabilityTest.className = "";
        ganttChart.innerHTML = "";
        timeline.innerHTML = "";
        stats.innerHTML = "";
    }
    
    // Visualization functions
    function displayGanttChart(schedule, tasks, duration) {
        ganttChart.innerHTML = "";
        timeline.innerHTML = "";
        
        // Calculate time unit width based on available space
        const containerWidth = ganttChart.clientWidth - 80;
        const minTimeUnitWidth = 20;
        const timeUnitWidth = Math.max(minTimeUnitWidth, Math.floor(containerWidth / duration));
        
        // Create a single timeline row
        const timelineRow = document.createElement('div');
        timelineRow.className = 'task-timeline';
        timelineRow.style.height = '50px';
        timelineRow.style.minWidth = `${duration * timeUnitWidth + 80}px`;
        
        // Track previous task to detect changes
        let previousTask = null;
        const timeMarkersToShow = new Set([0]);
        
        // Find all important time points
        for (let t = 0; t < duration; t++) {
            const currentTask = schedule[t];
            
            if (currentTask !== previousTask) {
                timeMarkersToShow.add(t);
                previousTask = currentTask;
            }
            
            tasks.forEach(task => {
                if (task.releases.includes(t) || task.deadlines.includes(t)) {
                    timeMarkersToShow.add(t);
                }
            });
        }
        
        // Add the final time marker
        timeMarkersToShow.add(duration);
        
        // Create execution blocks
        let currentTask = null;
        let blockStart = 0;
        
        for (let t = 0; t <= duration; t++) {
            const scheduledTask = t < duration ? schedule[t] : null;
            
            if (scheduledTask !== currentTask || t === duration) {
                if (currentTask !== null) {
                    const taskExecution = document.createElement('div');
                    taskExecution.className = `task-execution task-${currentTask}`;
                    taskExecution.style.left = `${80 + blockStart * timeUnitWidth}px`;
                    taskExecution.style.width = `${(t - blockStart) * timeUnitWidth}px`;
                    taskExecution.textContent = `Task ${currentTask}`;
                    timelineRow.appendChild(taskExecution);
                }
                
                currentTask = scheduledTask;
                blockStart = t;
            }
        }
        
        // Add period and deadline markers
        tasks.forEach(task => {
            task.releases.forEach(time => {
                if (time <= duration) {
                    const periodMarker = document.createElement('div');
                    periodMarker.className = 'period-marker';
                    periodMarker.style.left = `${80 + time * timeUnitWidth}px`;
                    timelineRow.appendChild(periodMarker);
                }
            });
            
            task.deadlines.forEach(time => {
                if (time <= duration) {
                    const deadlineMarker = document.createElement('div');
                    deadlineMarker.className = 'deadline-marker';
                    deadlineMarker.style.left = `${80 + time * timeUnitWidth}px`;
                    timelineRow.appendChild(deadlineMarker);
                }
            });
        });
        
        ganttChart.appendChild(timelineRow);
        
        // Create timeline markers
        const sortedMarkers = Array.from(timeMarkersToShow).sort((a, b) => a - b);
        sortedMarkers.forEach(t => {
            const timeMarker = document.createElement('div');
            timeMarker.className = 'time-marker';
            timeMarker.style.left = `${80 + t * timeUnitWidth}px`;
            timeMarker.textContent = t;
            timeline.appendChild(timeMarker);
            
            const timeSeparator = document.createElement('div');
            timeSeparator.className = 'time-separator';
            timeSeparator.style.left = `${80 + t * timeUnitWidth}px`;
            timeline.appendChild(timeSeparator);
        });
        
        // Add legend for markers
        const legend = document.createElement('div');
        legend.className = 'timeline-legend';
        legend.style.marginTop = '20px';
        legend.innerHTML = `
            <div><span class="legend-marker period-marker-legend"></span> Period Start/Arrival (P/A)</div>
            <div><span class="legend-marker deadline-marker-legend"></span> Deadline (D)</div>
        `;
        ganttChart.appendChild(legend);
    }
    
    function displayStats(tasks) {
        stats.innerHTML = "";
        
        tasks.forEach(task => {
            const taskStat = document.createElement('div');
            taskStat.className = `task-stat`;
            taskStat.style.borderLeft = `5px solid var(--task${task.id}-color)`;
            
            // Calculate statistics
            const totalInstances = task.instances.length;
            const completedInstances = task.instances.filter(inst => inst.completed).length;
            const missedInstances = task.missedDeadlines;
            
            const avgResponseTime = task.responseTime.length > 0 
                ? task.responseTime.reduce((sum, time) => sum + time, 0) / task.responseTime.length 
                : "N/A";
            
            const completionRate = totalInstances > 0
                ? ((completedInstances) / totalInstances * 100).toFixed(2)
                : "0.00";
            
            const deadlineMetRate = totalInstances > 0
                ? ((totalInstances - missedInstances) / totalInstances * 100).toFixed(2)
                : "0.00";
            
            const completionRateClass = 
                parseFloat(completionRate) >= 100 ? "completion-rate-good" :
                parseFloat(completionRate) >= 80 ? "completion-rate-warning" :
                "completion-rate-bad";
            
            const deadlineRateClass = 
                parseFloat(deadlineMetRate) >= 100 ? "completion-rate-good" :
                parseFloat(deadlineMetRate) >= 80 ? "completion-rate-warning" :
                "completion-rate-bad";
            const responseTimeClass = 
                avgResponseTime === "N/A" ? "" :
                avgResponseTime <= task.deadline * 0.5 ? "response-time-good" :
                avgResponseTime <= task.deadline * 0.8 ? "response-time-warning" :
                "response-time-bad";
            
            taskStat.innerHTML = `
                <h4>${task.name}</h4>
                <div class="task-stat-row">
                    <span>Arrival Time (A):</span>
                    <span>${task.arrivalTime}</span>
                </div>
                <div class="task-stat-row">
                    <span>Execution Time (C):</span>
                    <span>${task.executionTime}</span>
                </div>
                <div class="task-stat-row">
                    <span>Period (T):</span>
                    <span>${task.period}</span>
                </div>
                <div class="task-stat-row">
                    <span>Deadline (D):</span>
                    <span>${task.deadline}</span>
                </div>
                <div class="task-stat-row">
                    <span>Total Instances:</span>
                    <span>${totalInstances}</span>
                </div>
                <div class="task-stat-row">
                    <span>Completed Instances:</span>
                    <span>${completedInstances}</span>
                </div>
                <div class="task-stat-row">
                    <span>Missed Deadlines:</span>
                    <span>${missedInstances}</span>
                </div>
                <div class="task-stat-row">
                    <span>Average Response Time:</span>
                    <span class="${responseTimeClass}">${typeof avgResponseTime === 'number' ? avgResponseTime.toFixed(2) : avgResponseTime}</span>
                </div>
                <div class="task-stat-row">
                    <span>Completion Rate:</span>
                    <span class="${completionRateClass}">${completionRate}%</span>
                </div>
                <div class="task-stat-row">
                    <span>Deadline Met Rate:</span>
                    <span class="${deadlineRateClass}">${deadlineMetRate}%</span>
                </div>
            `;
            
            stats.appendChild(taskStat);
        });
    }
});