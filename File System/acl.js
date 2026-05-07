/* ============================================================
   acl.js — Access Control List Manager
   Implements user-based file permissions with ACL support.
   Features:
   - User management
   - File/directory creation with owners
   - Permission assignment (Read, Write, Execute)
   - Access control validation
   - Permission inheritance
   - Audit logging
   ============================================================ */

/**
 * ACL System State Management
 */
const aclState = {
  users: [],
  files: [],
  directories: [],
  permissions: [], // { userId, resourceId, resourceType, permissions: 'rwx' }
  auditLog: [],
  currentUser: null
};

/**
 * Constants
 */
const PERMISSION_BITS = {
  READ: 4,    // r
  WRITE: 2,   // w
  EXECUTE: 1  // x
};

const PERMISSION_STRINGS = {
  'r': 'Read',
  'w': 'Write',
  'x': 'Execute'
};

/**
 * Validation Helpers
 */
function validateUsername(name) {
  if (!name) return 'Please enter a username.';
  if (!/^[a-zA-Z0-9_-]{3,16}$/.test(name)) {
    return 'Username must be 3-16 characters (letters, numbers, hyphen, underscore).';
  }
  if (aclState.users.some(u => u.name === name)) {
    return `User "${name}" already exists.`;
  }
  return null;
}

function validateFilename(name) {
  if (!name) return 'Please enter a filename.';
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(name)) {
    return 'Invalid filename. Use letters, numbers, dot, hyphen, underscore.';
  }
  if (aclState.files.some(f => f.name === name)) {
    return `File "${name}" already exists.`;
  }
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * UI State Helpers
 */
function showError(message) {
  const el = document.getElementById('error-msg');
  el.innerHTML = `<strong>Error:</strong> ${message}`;
  el.classList.remove('hidden', 'status-success');
  el.classList.add('status-error');
  document.getElementById('validation-text').textContent = 'Error';
  document.getElementById('validation-pill').classList.add('is-error');
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showSuccess(message) {
  const el = document.getElementById('error-msg');
  el.innerHTML = `<strong>✓</strong> ${message}`;
  el.classList.remove('hidden', 'status-error');
  el.classList.add('status-success');
  document.getElementById('validation-text').textContent = 'Ready';
  document.getElementById('validation-pill').classList.remove('is-error');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

function setLiveStatus(title, message) {
  const card = document.getElementById('live-status-card');
  if (card) {
    card.innerHTML = `
      <span class="status-tag">ACL System</span>
      <h4 class="status-title">${escapeHtml(title)}</h4>
      <p class="status-desc">${escapeHtml(message)}</p>
    `;
  }
}

/**
 * User Management
 */
function createUser() {
  const input = document.getElementById('user-name-input');
  const name = input.value.trim();
  
  const error = validateUsername(name);
  if (error) {
    showError(error);
    return;
  }

  const user = {
    id: `user-${Date.now()}`,
    name: name,
    createdAt: new Date().toISOString()
  };

  aclState.users.push(user);
  addAuditLog('USER_CREATE', user.id, `User "${name}" created`);
  input.value = '';
  
  showSuccess(`User "${name}" created successfully.`);
  updateAllSelects();
  renderUsersList();
}

function deleteUser(userId) {
  const user = aclState.users.find(u => u.id === userId);
  if (!user) return;

  // Remove all permissions for this user
  aclState.permissions = aclState.permissions.filter(p => p.userId !== userId);
  aclState.users = aclState.users.filter(u => u.id !== userId);
  
  addAuditLog('USER_DELETE', userId, `User "${user.name}" deleted`);
  showSuccess(`User "${user.name}" deleted.`);
  updateAllSelects();
  renderUsersList();
  renderACLTable();
}

function renderUsersList() {
  const container = document.getElementById('users-list');
  
  if (aclState.users.length === 0) {
    container.innerHTML = 'No users created yet.';
    return;
  }

  const chips = aclState.users.map(user => `
    <div class="chip">
      <span class="chip-text">👤 ${escapeHtml(user.name)}</span>
      <button class="chip-close" onclick="deleteUser('${user.id}')" title="Delete user">×</button>
    </div>
  `).join('');

  container.innerHTML = chips;
}

/**
 * File Management
 */
function createFile() {
  const nameInput = document.getElementById('file-name-input');
  const ownerSelect = document.getElementById('file-owner-select');
  const name = nameInput.value.trim();
  const ownerId = ownerSelect.value;

  const error = validateFilename(name);
  if (error) {
    showError(error);
    return;
  }

  if (!ownerId) {
    showError('Please select a file owner.');
    return;
  }

  const owner = aclState.users.find(u => u.id === ownerId);
  
  const file = {
    id: `file-${Date.now()}`,
    name: name,
    ownerId: ownerId,
    ownerName: owner.name,
    type: 'file',
    size: Math.floor(Math.random() * 10000) + 100,
    createdAt: new Date().toISOString()
  };

  aclState.files.push(file);

  // Owner gets rwx by default
  assignPermissionDirect(ownerId, file.id, 'file', 'rwx');
  addAuditLog('FILE_CREATE', file.id, `File "${name}" created by ${owner.name}`);

  nameInput.value = '';
  showSuccess(`File "${name}" created with owner "${owner.name}".`);
  updateAllSelects();
  renderFileBrowser();
  renderACLTable();
}

function deleteFile(fileId) {
  const file = aclState.files.find(f => f.id === fileId);
  if (!file) return;

  // Only owner or admin can delete
  if (aclState.currentUser && file.ownerId !== aclState.currentUser && aclState.currentUser !== 'admin') {
    showError('Only the file owner can delete this file.');
    return;
  }

  // Remove all permissions for this file
  aclState.permissions = aclState.permissions.filter(p => p.resourceId !== fileId);
  aclState.files = aclState.files.filter(f => f.id !== fileId);
  
  addAuditLog('FILE_DELETE', fileId, `File "${file.name}" deleted`);
  showSuccess(`File "${file.name}" deleted.`);
  updateAllSelects();
  renderFileBrowser();
  renderACLTable();
}

function renderFileBrowser() {
  const container = document.getElementById('file-browser');
  
  if (aclState.files.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No files created yet. Create a file to begin.</p>
      </div>
    `;
    document.getElementById('file-count').textContent = '0 files';
    return;
  }

  const fileItems = aclState.files.map(file => {
    const perms = getFilePermissions(file.id);
    const permStr = perms ? formatPermissions(perms) : '---';
    const permColor = getPermissionColor(permStr);

    return `
      <div class="file-item">
        <div class="file-icon">📄</div>
        <div class="file-info">
          <div class="file-name">${escapeHtml(file.name)}</div>
          <div class="file-meta">
            <span class="meta-badge">Owner: ${escapeHtml(file.ownerName)}</span>
            <span class="meta-badge">${file.size} B</span>
          </div>
        </div>
        <div class="file-actions">
          <span class="perm-badge ${permColor}">${permStr}</span>
          <button class="file-btn" onclick="showFilePermissions('${file.id}')" title="View/Edit permissions">⚙️</button>
          <button class="file-btn delete-btn" onclick="deleteFile('${file.id}')" title="Delete file">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="file-list">${fileItems}</div>`;
  document.getElementById('file-count').textContent = `${aclState.files.length} file${aclState.files.length !== 1 ? 's' : ''}`;
}

function showFilePermissions(fileId) {
  const fileSelect = document.getElementById('permission-file-select');
  fileSelect.value = fileId;
  updatePermissionUserSelect();
  document.querySelector('html').scrollTop = 0;
}

/**
 * Permission Management
 */
function assignPermissions() {
  const fileSelect = document.getElementById('permission-file-select');
  const userSelect = document.getElementById('permission-user-select');
  const readCheck = document.getElementById('perm-read');
  const writeCheck = document.getElementById('perm-write');
  const execCheck = document.getElementById('perm-exec');

  const fileId = fileSelect.value;
  const userId = userSelect.value;

  if (!fileId || !userId) {
    showError('Please select both a file and a user.');
    return;
  }

  const file = aclState.files.find(f => f.id === fileId);
  const user = aclState.users.find(u => u.id === userId);

  if (!file || !user) {
    showError('Invalid file or user selection.');
    return;
  }

  // Check if current user can modify permissions (owner or admin)
  if (aclState.currentUser && file.ownerId !== aclState.currentUser && aclState.currentUser !== 'admin') {
    showError('Only the file owner can modify permissions.');
    return;
  }

  const perms = (readCheck.checked ? 'r' : '-') + 
                (writeCheck.checked ? 'w' : '-') + 
                (execCheck.checked ? 'x' : '-');

  assignPermissionDirect(userId, fileId, 'file', perms);
  addAuditLog('PERMISSION_ASSIGN', fileId, `Permissions set to ${perms} for ${user.name}`);

  readCheck.checked = false;
  writeCheck.checked = false;
  execCheck.checked = false;

  showSuccess(`Permissions "${perms}" assigned to ${user.name} for "${file.name}".`);
  renderACLTable();
  renderFileBrowser();
}

function assignPermissionDirect(userId, resourceId, resourceType, permString) {
  // Remove existing permission entry for this user-resource pair
  aclState.permissions = aclState.permissions.filter(p => 
    !(p.userId === userId && p.resourceId === resourceId)
  );

  // Add new permission entry
  aclState.permissions.push({
    userId: userId,
    resourceId: resourceId,
    resourceType: resourceType,
    permissions: permString,
    createdAt: new Date().toISOString()
  });
}

function getFilePermissions(fileId) {
  // Get all permissions for this file
  const perms = aclState.permissions.filter(p => p.resourceId === fileId);
  return perms;
}

function formatPermissions(permArray) {
  if (!Array.isArray(permArray) || permArray.length === 0) return '---';
  // Return first permission's permission string (or combine if needed)
  return permArray[0].permissions || '---';
}

function getPermissionColor(permString) {
  if (permString === 'rwx') return 'perm-rwx';
  if (permString === 'rw-') return 'perm-rw';
  if (permString === 'r--') return 'perm-r';
  if (permString === '--x') return 'perm-x';
  return 'perm-none';
}

function renderACLTable() {
  const container = document.getElementById('acl-table');

  if (aclState.permissions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔒</div>
        <p>No ACL entries. Assign permissions to users to populate this table.</p>
      </div>
    `;
    document.getElementById('acl-count').textContent = '0 entries';
    return;
  }

  const rows = aclState.permissions.map(perm => {
    const file = aclState.files.find(f => f.id === perm.resourceId);
    const user = aclState.users.find(u => u.id === perm.userId);
    const permStr = perm.permissions || '---';
    const permColor = getPermissionColor(permStr);

    return `
      <tr class="acl-row">
        <td class="acl-cell resource-cell">
          <span class="resource-icon">📄</span>
          ${escapeHtml(file ? file.name : 'Unknown')}
        </td>
        <td class="acl-cell user-cell">
          ${escapeHtml(user ? user.name : 'Unknown')}
          ${file && user && file.ownerId === user.id ? '<span class="owner-label">Owner</span>' : ''}
        </td>
        <td class="acl-cell perm-cell">
          <div class="perm-stack">
            <span class="perm-details">
              <span class="perm-bit r ${permStr[0] === 'r' ? 'active' : ''}">r</span>
              <span class="perm-bit w ${permStr[1] === 'w' ? 'active' : ''}">w</span>
              <span class="perm-bit x ${permStr[2] === 'x' ? 'active' : ''}">x</span>
            </span>
            <span class="perm-string ${permColor}">${permStr}</span>
          </div>
        </td>
        <td class="acl-cell action-cell">
          <button class="acl-btn edit-btn" onclick="editPermission('${perm.userId}', '${perm.resourceId}')" title="Edit">✏️</button>
          <button class="acl-btn delete-btn" onclick="deletePermission('${perm.userId}', '${perm.resourceId}')" title="Delete">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="acl-table-scroll">
      <table class="acl-table">
        <thead>
          <tr class="acl-header">
            <th class="acl-cell resource-cell">Resource</th>
            <th class="acl-cell user-cell">User</th>
            <th class="acl-cell perm-cell">Permissions</th>
            <th class="acl-cell action-cell">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('acl-count').textContent = `${aclState.permissions.length} entry${aclState.permissions.length !== 1 ? 'ies' : ''}`;
}

function editPermission(userId, resourceId) {
  document.getElementById('permission-file-select').value = resourceId;
  document.getElementById('permission-user-select').value = userId;
  updatePermissionBits(userId, resourceId);
}

function deletePermission(userId, resourceId) {
  const file = aclState.files.find(f => f.id === resourceId);
  const user = aclState.users.find(u => u.id === userId);

  if (!file || !user) return;

  // Check if owner tries to delete own permission
  if (file.ownerId === userId) {
    showError('Cannot remove permissions from the file owner.');
    return;
  }

  aclState.permissions = aclState.permissions.filter(p => 
    !(p.userId === userId && p.resourceId === resourceId)
  );

  addAuditLog('PERMISSION_DELETE', resourceId, `Permissions removed for ${user.name}`);
  showSuccess(`Permissions removed for ${user.name}.`);
  renderACLTable();
  renderFileBrowser();
}

function updatePermissionBits(userId, resourceId) {
  const perm = aclState.permissions.find(p => p.userId === userId && p.resourceId === resourceId);
  const permStr = perm ? perm.permissions : '---';

  document.getElementById('perm-read').checked = permStr[0] === 'r';
  document.getElementById('perm-write').checked = permStr[1] === 'w';
  document.getElementById('perm-exec').checked = permStr[2] === 'x';
}

/**
 * Select Updates
 */
function updateAllSelects() {
  updateUserSelects();
  updateFileSelects();
}

function updateUserSelects() {
  const userOptions = aclState.users.length === 0 
    ? '<option value="">No users created</option>'
    : `<option value="">Select user</option>${aclState.users.map(u => 
        `<option value="${u.id}">${escapeHtml(u.name)}</option>`
      ).join('')}`;

  document.getElementById('permission-user-select').innerHTML = userOptions;
  document.getElementById('test-user-select').innerHTML = userOptions;
}

function updateFileSelects() {
  const fileOptions = aclState.files.length === 0
    ? '<option value="">No files created</option>'
    : `<option value="">Select file</option>${aclState.files.map(f => 
        `<option value="${f.id}">${escapeHtml(f.name)}</option>`
      ).join('')}`;

  document.getElementById('file-owner-select').innerHTML = `<option value="">Select owner</option>${aclState.users.map(u => 
    `<option value="${u.id}">${escapeHtml(u.name)}</option>`
  ).join('')}`;
  document.getElementById('permission-file-select').innerHTML = fileOptions;
  document.getElementById('test-file-select').innerHTML = fileOptions;
}

function updatePermissionUserSelect() {
  const fileSelect = document.getElementById('permission-file-select');
  const fileId = fileSelect.value;
  const userSelect = document.getElementById('permission-user-select');

  const userOptions = aclState.users.length === 0
    ? '<option value="">No users created</option>'
    : `<option value="">Select user</option>${aclState.users.map(u => 
        `<option value="${u.id}">${escapeHtml(u.name)}</option>`
      ).join('')}`;

  userSelect.innerHTML = userOptions;
}

/**
 * Access Control Testing
 */
function testAccess() {
  const userSelect = document.getElementById('test-user-select');
  const fileSelect = document.getElementById('test-file-select');
  const actionSelect = document.getElementById('test-action-select');

  const userId = userSelect.value;
  const fileId = fileSelect.value;
  const action = actionSelect.value;

  if (!userId || !fileId) {
    showError('Select both user and file to test access.');
    return;
  }

  const file = aclState.files.find(f => f.id === fileId);
  const user = aclState.users.find(u => u.id === userId);

  if (!file || !user) {
    showError('Invalid user or file.');
    return;
  }

  const result = checkAccess(userId, fileId, action);
  displayTestResult(user.name, file.name, action, result);
  addAuditLog('ACCESS_TEST', fileId, `${user.name} tested ${action} access: ${result.granted ? 'GRANTED' : 'DENIED'}`);
}

function checkAccess(userId, fileId, action) {
  const file = aclState.files.find(f => f.id === fileId);
  const user = aclState.users.find(u => u.id === userId);

  if (!file || !user) {
    return {
      granted: false,
      reason: 'Invalid user or file'
    };
  }

  // Owner always has full access
  if (file.ownerId === userId) {
    return {
      granted: true,
      reason: 'Owner has full access'
    };
  }

  // Check ACL entry
  const perm = aclState.permissions.find(p => p.userId === userId && p.resourceId === fileId);

  if (!perm || perm.permissions === '---') {
    return {
      granted: false,
      reason: `No ${action} permission granted`
    };
  }

  const actionMap = { 'read': 'r', 'write': 'w', 'exec': 'x' };
  const permChar = actionMap[action];

  if (perm.permissions[permChar === 'r' ? 0 : permChar === 'w' ? 1 : 2] === permChar) {
    return {
      granted: true,
      reason: `${action.toUpperCase()} permission granted`
    };
  }

  return {
    granted: false,
    reason: `No ${action} permission granted`
  };
}

function displayTestResult(userName, fileName, action, result) {
  const resultEl = document.getElementById('test-result');
  const statusClass = result.granted ? 'result-granted' : 'result-denied';
  const statusIcon = result.granted ? '✓' : '✗';

  resultEl.innerHTML = `
    <div class="result-content ${statusClass}">
      <span class="result-icon">${statusIcon}</span>
      <div class="result-text">
        <strong>${result.granted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}</strong>
        <p>${escapeHtml(userName)} → ${escapeHtml(fileName)} (${action})</p>
        <p class="result-reason">${escapeHtml(result.reason)}</p>
      </div>
    </div>
  `;

  resultEl.classList.remove('hidden');
}

/**
 * Audit Logging
 */
function addAuditLog(action, resourceId, details) {
  aclState.auditLog.push({
    timestamp: new Date().toISOString(),
    action: action,
    resourceId: resourceId,
    details: details
  });
}

function getAuditLog() {
  return aclState.auditLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Report Generation
 */
function generateReport() {
  const stats = {
    totalUsers: aclState.users.length,
    totalFiles: aclState.files.length,
    totalPermissions: aclState.permissions.length,
    users: aclState.users.map(u => u.name),
    files: aclState.files.map(f => ({
      name: f.name,
      owner: f.ownerName,
      size: f.size
    })),
    permissions: aclState.permissions.map(p => {
      const file = aclState.files.find(f => f.id === p.resourceId);
      const user = aclState.users.find(u => u.id === p.userId);
      return {
        user: user ? user.name : 'Unknown',
        file: file ? file.name : 'Unknown',
        permissions: p.permissions
      };
    }),
    auditLog: getAuditLog()
  };

  displayReport(stats);
}

function displayReport(stats) {
  const reportHtml = `
    <div class="report">
      <h3>📊 ACL System Report</h3>
      <div class="report-section">
        <h4>Summary Statistics</h4>
        <ul>
          <li>Total Users: ${stats.totalUsers}</li>
          <li>Total Files: ${stats.totalFiles}</li>
          <li>Total ACL Entries: ${stats.totalPermissions}</li>
        </ul>
      </div>
      ${stats.files.length > 0 ? `
        <div class="report-section">
          <h4>Files</h4>
          <ul>
            ${stats.files.map(f => `
              <li>${escapeHtml(f.name)} - Owner: ${escapeHtml(f.owner)} (${f.size} bytes)</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
      ${stats.permissions.length > 0 ? `
        <div class="report-section">
          <h4>Access Control Entries</h4>
          <table class="report-table">
            <tr><th>User</th><th>File</th><th>Permissions</th></tr>
            ${stats.permissions.map(p => `
              <tr>
                <td>${escapeHtml(p.user)}</td>
                <td>${escapeHtml(p.file)}</td>
                <td><code>${p.permissions}</code></td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : ''}
    </div>
  `;

  setLiveStatus('Report Generated', `Generated report with ${stats.totalUsers} users and ${stats.totalFiles} files`);
  showSuccess('Report generated successfully!');
  console.log('ACL Report:', stats);
}

/**
 * Demo Data
 */
function loadDemoData() {
  resetAllACL();

  // Create demo users
  const users = ['admin', 'alice', 'bob', 'charlie', 'guest'];
  users.forEach(name => {
    const user = {
      id: `user-${name}`,
      name: name,
      createdAt: new Date().toISOString()
    };
    aclState.users.push(user);
  });

  // Create demo files
  const files = [
    { name: 'report.txt', owner: 'user-admin', size: 2048 },
    { name: 'project.pdf', owner: 'user-alice', size: 5120 },
    { name: 'notes.txt', owner: 'user-bob', size: 1024 },
    { name: 'data.csv', owner: 'user-charlie', size: 4096 }
  ];

  files.forEach(f => {
    const file = {
      id: `file-${f.name}`,
      name: f.name,
      ownerId: f.owner,
      ownerName: f.owner.replace('user-', ''),
      type: 'file',
      size: f.size,
      createdAt: new Date().toISOString()
    };
    aclState.files.push(file);

    // Owner gets rwx
    assignPermissionDirect(f.owner, file.id, 'file', 'rwx');
  });

  // Assign various permissions
  const perms = [
    { userId: 'user-alice', fileId: 'file-report.txt', perms: 'r--' },
    { userId: 'user-bob', fileId: 'file-report.txt', perms: 'rw-' },
    { userId: 'user-charlie', fileId: 'file-report.txt', perms: 'r--' },
    { userId: 'user-guest', fileId: 'file-report.txt', perms: '--x' },
    
    { userId: 'user-bob', fileId: 'file-project.pdf', perms: 'r--' },
    { userId: 'user-charlie', fileId: 'file-project.pdf', perms: 'rw-' },
    
    { userId: 'user-alice', fileId: 'file-notes.txt', perms: 'rw-' },
    { userId: 'user-charlie', fileId: 'file-notes.txt', perms: 'r--' },
    
    { userId: 'user-alice', fileId: 'file-data.csv', perms: 'r--' },
    { userId: 'user-bob', fileId: 'file-data.csv', perms: 'r--' },
    { userId: 'user-guest', fileId: 'file-data.csv', perms: '---' }
  ];

  perms.forEach(p => {
    assignPermissionDirect(p.userId, p.fileId, 'file', p.perms);
  });

  updateAllSelects();
  renderUsersList();
  renderFileBrowser();
  renderACLTable();

  showSuccess('Demo data loaded successfully!');
  setLiveStatus('Demo Loaded', `Loaded ${aclState.users.length} users, ${aclState.files.length} files, and ${aclState.permissions.length} ACL entries`);
  addAuditLog('DEMO_LOAD', 'system', 'Demo data loaded');
}

/**
 * Reset
 */
function resetAllACL() {
  aclState.users = [];
  aclState.files = [];
  aclState.permissions = [];
  aclState.auditLog = [];
  aclState.currentUser = null;

  document.getElementById('user-name-input').value = '';
  document.getElementById('file-name-input').value = '';
  document.getElementById('perm-read').checked = false;
  document.getElementById('perm-write').checked = false;
  document.getElementById('perm-exec').checked = false;
  document.getElementById('test-result').classList.add('hidden');

  updateAllSelects();
  renderUsersList();
  renderFileBrowser();
  renderACLTable();

  showSuccess('All ACL data cleared.');
  setLiveStatus('Reset Complete', 'Ready to set up a new ACL system');
}

/**
 * Export/Import
 */
function exportACLData() {
  const data = {
    timestamp: new Date().toISOString(),
    users: aclState.users,
    files: aclState.files,
    permissions: aclState.permissions,
    auditLog: aclState.auditLog
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `acl-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showSuccess('ACL data exported as JSON.');
}

/**
 * Initialization
 */
function initACLSystem() {
  updateAllSelects();
  renderUsersList();
  renderFileBrowser();
  renderACLTable();
  
  setLiveStatus('Ready to manage access', 'Create users, files, and assign permissions with Read (r), Write (w), and Execute (x) rights.');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initACLSystem);
