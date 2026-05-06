document.addEventListener('DOMContentLoaded', () => {
    // Global state to track processes and files
    const processState = {
        processes: new Map(), // Map of PID to process info
        nextPid: 2,
    };

    const fileState = {
        files: new Map(), // Map of filename to file content
        openFiles: new Map(), // Map of fd to {filename, mode}
        nextFd: 3, // Starting from 3 as 0,1,2 are stdin, stdout, stderr
    };

    // Initialize root process
    processState.processes.set(1, {
        pid: 1,
        ppid: 0,
        status: 'running',
        command: './init',
    });

    // Navigation for both modules
    const navButtons = document.querySelectorAll('.nav-btn');
    const fileNavButtons = document.querySelectorAll('.file-nav-btn');
    const demos = document.querySelectorAll('.demo');
    const fileDemos = document.querySelectorAll('.file-demo');
    const syscallInfo = document.getElementById('syscall-info');
    const fileInfo = document.getElementById('file-info');

    const syscallData = {
        fork: {
            title: 'Fork() System Call',
            description: 'Creates a new process by duplicating the calling process',
            code: `pid_t pid = fork();
if (pid == 0) {
    // Child process
    printf("Child process\\n");
} else if (pid > 0) {
    // Parent process
    printf("Parent process\\n");
}`
        },
        exec: {
            title: 'Exec() System Call',
            description: 'Executes a program referred by the pathname',
            code: `execl("/bin/ls", "ls", "-l", NULL);
// If execl returns, it failed
perror("execl failed");`
        },
        wait: {
            title: 'Wait() System Call',
            description: 'Suspends execution until child process terminates',
            code: `pid_t pid;
int status;
pid = wait(&status);
if (pid > 0) {
    printf("Child %d terminated\\n", pid);
}`
        },
        exit: {
            title: 'Exit() System Call',
            description: 'Terminates the calling process',
            code: `// Perform cleanup
exit(EXIT_SUCCESS);`
        }
    };

    const fileOpsData = {
        open: {
            title: 'Open() System Call',
            description: 'Opens or creates a file',
            code: `int fd = open("filename", O_RDWR | O_CREAT, 0644);
if (fd < 0) {
    perror("Error opening file");
    return -1;
}`
        },
        read: {
            title: 'Read() System Call',
            description: 'Reads data from a file',
            code: `char buffer[1024];
ssize_t bytes_read = read(fd, buffer, sizeof(buffer));
if (bytes_read < 0) {
    perror("Error reading file");
    return -1;
}`
        },
        write: {
            title: 'Write() System Call',
            description: 'Writes data to a file',
            code: `const char *data = "Hello, World!";
ssize_t bytes_written = write(fd, data, strlen(data));
if (bytes_written < 0) {
    perror("Error writing to file");
    return -1;
}`
        }
    };

    function updateSyscallInfo(callType) {
        const info = syscallData[callType];
        syscallInfo.innerHTML = `
            <h2>${info.title}</h2>
            <p>${info.description}</p>
            <pre><code>${info.code}</code></pre>
        `;
    }

    function updateFileInfo(opType) {
        const info = fileOpsData[opType];
        fileInfo.innerHTML = `
            <h2>${info.title}</h2>
            <p>${info.description}</p>
            <pre><code>${info.code}</code></pre>
        `;
    }

    function getAllDescendants(pid) {
        const descendants = [];
        const stack = [pid];
        
        while (stack.length > 0) {
            const currentPid = stack.pop();
            const children = Array.from(processState.processes.values())
                .filter(p => p.ppid === currentPid)
                .map(p => p.pid);
            
            descendants.push(...children);
            stack.push(...children);
        }
        
        return descendants;
    }

    function adoptOrphanedProcesses(terminatedPid) {
        Array.from(processState.processes.values())
            .filter(p => p.ppid === terminatedPid)
            .forEach(child => {
                child.ppid = 1; // Adopt by init process
                updateProcessTree();
            });
    }

    function updateProcessLists() {
        document.querySelectorAll('.process-list').forEach(list => {
            const demo = list.closest('.demo').id;
            const processes = Array.from(processState.processes.values());
            
            let eligibleProcesses;
            switch (demo) {
                case 'exec-demo':
                    eligibleProcesses = processes.filter(p => p.status === 'running' && p.pid !== 1);
                    break;
                case 'wait-demo':
                    eligibleProcesses = processes.filter(p => {
                        const descendants = getAllDescendants(p.pid);
                        return p.status === 'running' && descendants.length > 0;
                    });
                    break;
                case 'exit-demo':
                    eligibleProcesses = processes.filter(p => p.status === 'running' && p.pid !== 1);
                    break;
                default:
                    eligibleProcesses = processes;
            }

            list.innerHTML = eligibleProcesses.map(p => `
                <button class="process-select-btn" data-pid="${p.pid}">
                    PID: ${p.pid} ${p.command !== './init' ? `(${p.command})` : ''}
                </button>
            `).join('');
        });
    }

    function updateFileList() {
        const fileList = document.querySelector('.open-files-list');
        fileList.innerHTML = Array.from(fileState.openFiles.entries()).map(([fd, file]) => `
            <div class="file-entry">
                <span>FD: ${fd}</span>
                <span>File: ${file.filename}</span>
                <span>Mode: ${file.mode}</span>
            </div>
        `).join('');
    }

    function updateProcessTree() {
        const container = document.querySelector('.process-tree');
        container.innerHTML = '';
        
        function renderProcess(pid) {
            const process = processState.processes.get(pid);
            if (!process) return '';

            const children = Array.from(processState.processes.values())
                .filter(p => p.ppid === pid);

            const processEl = document.createElement('div');
            processEl.className = 'process';
            processEl.innerHTML = `
                <div class="process-info">
                    <button class="process-btn" data-pid="${pid}">PID: ${pid}</button>
                    <span class="process-status ${process.status}">${process.status}</span>
                    ${process.command !== './init' ? `<span class="process-command">${process.command}</span>` : ''}
                </div>
                <div class="children"></div>
            `;

            const childrenContainer = processEl.querySelector('.children');
            children.forEach(child => {
                childrenContainer.appendChild(renderProcess(child.pid));
            });

            return processEl;
        }

        container.appendChild(renderProcess(1));
        updateProcessLists();
    }

    // Navigation handlers
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const callType = button.dataset.call;
            
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            demos.forEach(demo => {
                demo.classList.remove('active');
                if (demo.id === `${callType}-demo`) {
                    demo.classList.add('active');
                }
            });

            updateSyscallInfo(callType);
            updateProcessLists();
        });
    });

    fileNavButtons.forEach(button => {
        button.addEventListener('click', () => {
            const opType = button.dataset.op;
            
            fileNavButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            fileDemos.forEach(demo => {
                demo.classList.remove('active');
                if (demo.id === `${opType}-demo`) {
                    demo.classList.add('active');
                }
            });

            updateFileInfo(opType);
        });
    });

    // Fork Demo
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('process-btn')) {
            const parentPid = parseInt(e.target.dataset.pid);
            const parentProcess = processState.processes.get(parentPid);
            
            if (parentProcess && parentProcess.status === 'running') {
                const newPid = processState.nextPid++;
                processState.processes.set(newPid, {
                    pid: newPid,
                    ppid: parentPid,
                    status: 'running',
                    command: parentProcess.command,
                });

                updateProcessTree();

                // Animation
                const newProcess = document.querySelector(`[data-pid="${newPid}"]`).parentElement.parentElement;
                newProcess.style.opacity = '0';
                newProcess.style.transform = 'translateX(-20px)';
                requestAnimationFrame(() => {
                    newProcess.style.transition = 'all 0.3s ease';
                    newProcess.style.opacity = '1';
                    newProcess.style.transform = 'translateX(0)';
                });
            }
        }
    });

    // Exec Demo
    let selectedExecPid = null;
    const commandSelector = document.querySelector('.command-selector');
    const output = document.querySelector('.terminal .output');

    document.querySelector('#exec-demo .process-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('process-select-btn')) {
            const pid = parseInt(e.target.dataset.pid);
            selectedExecPid = pid;
            
            document.querySelectorAll('#exec-demo .process-select-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            e.target.classList.add('selected');
            commandSelector.classList.remove('hidden');
        }
    });

    document.querySelector('.execute-btn').addEventListener('click', () => {
        if (selectedExecPid && processState.processes.get(selectedExecPid)?.status === 'running') {
            const process = processState.processes.get(selectedExecPid);
            const command = document.querySelector('.command-select').value;
            process.command = `/bin/${command}`;
            
            output.innerHTML = `
                <div>PID ${selectedExecPid} executing: ${process.command}</div>
                <div class="exec-output">
                    ${command === 'ls' ? `total 4<br>
                    drwxr-xr-x 2 user user 4096 Mar 14 10:30 documents<br>
                    -rw-r--r-- 1 user user  156 Mar 14 10:29 example.txt` :
                    command === 'ps' ? `  PID TTY          TIME CMD<br>
                    ${Array.from(processState.processes.values())
                        .map(p => `  ${p.pid} ?        00:00:00 ${p.command}`)
                        .join('<br>')}` :
                    new Date().toString()}
                </div>
            `;
            output.classList.remove('hidden');
            updateProcessTree();
        }
    });

    // Wait Demo
    let selectedWaitPid = null;
    const waitDemo = document.getElementById('wait-demo');
    const progressBar = waitDemo.querySelector('.progress-bar');
    const parentStatus = waitDemo.querySelector('.status');

    document.querySelector('#wait-demo .process-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('process-select-btn')) {
            const pid = parseInt(e.target.dataset.pid);
            selectedWaitPid = pid;
            
            document.querySelectorAll('#wait-demo .process-select-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            e.target.classList.add('selected');

            const descendants = getAllDescendants(pid);
            if (descendants.length > 0 && !progressBar.classList.contains('running')) {
                progressBar.classList.add('running');
                progressBar.style.setProperty('--progress', '100%');
                parentStatus.textContent = `PID ${pid} waiting for descendants to terminate`;
                
                // Sort descendants by their depth (terminate leaf nodes first)
                const sortedDescendants = descendants.sort((a, b) => {
                    const getDepth = (pid) => {
                        let depth = 0;
                        let current = processState.processes.get(pid);
                        while (current && current.ppid !== 0) {
                            depth++;
                            current = processState.processes.get(current.ppid);
                        }
                        return depth;
                    };
                    return getDepth(b) - getDepth(a);
                });

                let delay = 0;
                sortedDescendants.forEach(descendantPid => {
                    setTimeout(() => {
                        const process = processState.processes.get(descendantPid);
                        if (process) {
                            process.status = 'terminated';
                            updateProcessTree();
                            parentStatus.textContent = `Terminated PID ${descendantPid}`;
                        }
                    }, delay);
                    delay += 1000;
                });

                setTimeout(() => {
                    parentStatus.textContent = `All descendants of PID ${pid} terminated`;
                    progressBar.classList.remove('running');
                    updateProcessTree();
                }, delay);
            }
        }
    });

    // Exit Demo
    let selectedExitPid = null;
    const exitBtn = document.querySelector('.exit-btn');
    const processHeader = document.querySelector('.process-header');
    const processStatus = document.querySelector('.process-status');

    document.querySelector('#exit-demo .process-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('process-select-btn')) {
            const pid = parseInt(e.target.dataset.pid);
            selectedExitPid = pid;
            
            document.querySelectorAll('#exit-demo .process-select-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            e.target.classList.add('selected');

            processHeader.textContent = `Process (PID: ${pid})`;
            exitBtn.disabled = false;
        }
    });

    exitBtn.addEventListener('click', () => {
        if (selectedExitPid && processState.processes.get(selectedExitPid)?.status === 'running') {
            const process = processState.processes.get(selectedExitPid);
            processStatus.textContent = `Exiting PID ${selectedExitPid}...`;
            processStatus.style.color = '#ef4444';
            
            // Terminate the selected process and adopt its children
            setTimeout(() => {
                process.status = 'terminated';
                adoptOrphanedProcesses(selectedExitPid);
                processStatus.textContent = `Process ${selectedExitPid} Terminated (children adopted by init)`;
                exitBtn.disabled = true;
                updateProcessTree();
            }, 500);
        }
    });

    // File Operations
    document.querySelector('.open-file-btn').addEventListener('click', () => {
        const filename = document.querySelector('.filename-input').value.trim();
        if (filename) {
            // Check if file is already open
            const isAlreadyOpen = Array.from(fileState.openFiles.values())
                .some(file => file.filename === filename);
            
            if (isAlreadyOpen) {
                alert(`File "${filename}" is already open.`);
                return;
            }
            
            const fd = fileState.nextFd++;
            fileState.openFiles.set(fd, {
                filename,
                mode: 'rw'
            });
            if (!fileState.files.has(filename)) {
                fileState.files.set(filename, '');
            }
            
            // Update file selectors in read and write demos
            updateFileSelectors();
            updateFileList();
            
            // Show success message
            document.querySelector('.open-status').textContent = `File opened with FD: ${fd}`;
        }
    });

    // Function to update file selectors in read and write demos
    function updateFileSelectors() {
        const readSelect = document.querySelector('#read-demo .fd-select');
        const writeSelect = document.querySelector('#write-demo .fd-select');
        
        // Save current selections
        const readFd = readSelect.value;
        const writeFd = writeSelect.value;
        
        // Clear options
        readSelect.innerHTML = '';
        writeSelect.innerHTML = '';
        
        // Add default option
        const defaultReadOption = document.createElement('option');
        defaultReadOption.value = '';
        defaultReadOption.textContent = 'Select file descriptor';
        defaultReadOption.disabled = true;
        defaultReadOption.selected = true;
        readSelect.appendChild(defaultReadOption);
        
        const defaultWriteOption = document.createElement('option');
        defaultWriteOption.value = '';
        defaultWriteOption.textContent = 'Select file descriptor';
        defaultWriteOption.disabled = true;
        defaultWriteOption.selected = true;
        writeSelect.appendChild(defaultWriteOption);
        
        // Add options for each open file
        fileState.openFiles.forEach((file, fd) => {
            const readOption = document.createElement('option');
            readOption.value = fd;
            readOption.textContent = `FD: ${fd} (${file.filename})`;
            readSelect.appendChild(readOption);
            
            const writeOption = document.createElement('option');
            writeOption.value = fd;
            writeOption.textContent = `FD: ${fd} (${file.filename})`;
            writeSelect.appendChild(writeOption);
        });
        
        // Restore previous selections if they still exist
        if (readFd && Array.from(readSelect.options).some(opt => opt.value === readFd)) {
            readSelect.value = readFd;
        }
        
        if (writeFd && Array.from(writeSelect.options).some(opt => opt.value === writeFd)) {
            writeSelect.value = writeFd;
        }
    }

    // Write to File
    document.querySelector('.write-file-btn').addEventListener('click', () => {
        const fdSelect = document.querySelector('#write-demo .fd-select');
        const contentTextarea = document.querySelector('.write-content');
        const writeStatus = document.querySelector('.write-status');
        
        const fd = parseInt(fdSelect.value);
        const content = contentTextarea.value;
        
        if (fd && fileState.openFiles.has(fd)) {
            fileState.openFiles.get(fd).content = content;
            const filename = fileState.openFiles.get(fd).filename;
            fileState.files.set(filename, content);
            writeStatus.textContent = `Successfully wrote ${content.length} bytes to fd: ${fd}`;
            writeStatus.style.color = 'green';
            
            // Update the open files list to reflect the new file size
            updateFileList();
            
            // Clear textarea
            contentTextarea.value = '';
        } else {
            writeStatus.textContent = 'Error: Invalid file descriptor';
            writeStatus.style.color = 'red';
        }
    });

    document.querySelector('.read-file-btn').addEventListener('click', () => {
        const fdSelect = document.querySelector('#read-demo .fd-select');
        const fd = parseInt(fdSelect.value);
        const outputElement = document.querySelector('.read-output');
        
        if (isNaN(fd)) {
            outputElement.textContent = 'Error: No file descriptor selected';
            outputElement.style.color = 'red';
            return;
        }
        
        if (fileState.openFiles.has(fd)) {
            const { filename } = fileState.openFiles.get(fd);
            const content = fileState.files.get(filename);
            outputElement.textContent = content || '(empty file)';
            outputElement.style.color = 'inherit';
            document.querySelector('.read-status').textContent = `Read ${content.length} bytes from FD: ${fd}`;
            document.querySelector('.read-status').style.color = 'green';
        } else {
            outputElement.textContent = `Error: Invalid file descriptor ${fd}`;
            outputElement.style.color = 'red';
        }
    });

    function updateFileList() {
        const fileList = document.querySelector('.open-files-list');
        if (fileState.openFiles.size === 0) {
            fileList.innerHTML = '<p>No open files</p>';
        } else {
            fileList.innerHTML = '<h3>Open Files</h3>';
            const table = document.createElement('table');
            table.className = 'files-table';
            
            // Create header
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>FD</th>
                    <th>Filename</th>
                    <th>Mode</th>
                    <th>Size</th>
                    <th>Action</th>
                </tr>
            `;
            table.appendChild(thead);
            
            // Create body
            const tbody = document.createElement('tbody');
            fileState.openFiles.forEach((file, fd) => {
                const content = fileState.files.get(file.filename) || '';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${fd}</td>
                    <td>${file.filename}</td>
                    <td>${file.mode}</td>
                    <td>${content.length} bytes</td>
                    <td><button class="close-file-btn" data-fd="${fd}">Close</button></td>
                `;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            
            fileList.appendChild(table);
            
            // Add event listeners to close buttons
            document.querySelectorAll('.close-file-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const fd = parseInt(btn.dataset.fd);
                    if (fileState.openFiles.has(fd)) {
                        fileState.openFiles.delete(fd);
                        updateFileSelectors();
                        updateFileList();
                    }
                });
            });
        }
    }

    // Initial renders
    updateProcessTree();
    updateFileList();
    updateFileSelectors(); // Add this to initialize file selectors
});