# Access Control List (ACL) Manager

A comprehensive implementation of Access Control List (ACL) management for file systems, demonstrating fine-grained permission control and user-based access management.

## 📋 Overview

This ACL Manager module provides a complete system for managing file permissions in an OS learning environment. It implements user-based access control with support for Read (r), Write (w), and Execute (x) permissions, offering a modern alternative to traditional file permissions.

## 🎯 Features

### Core Features

#### 1. **User Management**
- Create and delete users
- Track user metadata and creation timestamps
- Support for multiple concurrent users
- User validation and uniqueness checks

#### 2. **File Management**
- Create files with designated owners
- File ownership and size tracking
- File browser with visual representation
- Delete files with ownership validation

#### 3. **Permission Management**
- Assign Read (r), Write (w), Execute (x) permissions per user
- Modify existing permissions
- Remove permissions (except from owner)
- Visual permission indicators (rwx format)

#### 4. **Access Control Validation**
- Pre-operation permission checks
- Owner has automatic full access (rwx)
- Detailed access test interface
- Real-time permission verification

#### 5. **Permission Inheritance**
- Files inherit owner permissions by default
- Owner automatically receives 'rwx' permissions
- Consistent security policy propagation

#### 6. **Audit Logging**
- Track all system operations
- User creation/deletion events
- Permission assignment/modification logs
- File access test results
- Exportable audit trail

#### 7. **Reporting**
- Generate comprehensive system reports
- Statistics on users, files, and permissions
- Exportable JSON data
- Access control summary

## 📁 Files

| File | Purpose |
|------|---------|
| `acl.html` | Main ACL manager interface |
| `acl.js` | Core ACL system logic and functionality |
| `acl.css` | ACL-specific styling and UI components |
| `acl-explanation.html` | Educational guide about ACL systems |
| `README.md` | This documentation file |

## 🚀 Getting Started

### Opening the ACL Manager

1. Navigate to the **File System** module folder
2. Open `acl.html` in your web browser

### Basic Workflow

#### Step 1: Create Users
1. Enter a username (3-16 characters, alphanumeric)
2. Click "Add User"
3. Users appear as chips in the user list

#### Step 2: Create Files
1. Enter a filename in the File input
2. Select an owner from the dropdown
3. Click "Create File"
4. Owner automatically receives 'rwx' permissions

#### Step 3: Assign Permissions
1. Select a file from the dropdown
2. Select a user to grant permissions
3. Check the desired permissions (r, w, x)
4. Click "Assign Permissions"

#### Step 4: Test Access
1. Select a user and file
2. Choose an action (Read, Write, Execute)
3. Click "Test"
4. View the access result (Granted/Denied)

## 📊 UI Components

### Sidebar Controls

**Section 01: System Setup**
- Create users and manage user list
- Display all active users

**Section 02: Files**
- Create files with designated owners
- Browse all files in the system

**Section 03: Permissions**
- Assign Read, Write, Execute permissions
- Modify existing ACL entries
- Manage user permissions per file

### Main Content Area

**File Browser**
- Visual display of all files
- Shows owner, size, and current permissions
- Quick access to permission management
- Delete functionality

**ACL Table**
- Comprehensive view of all permission entries
- Shows user-file-permission mappings
- Edit and delete capabilities
- Visual permission indicators

**Access Test**
- Test permission scenarios
- Real-time access verification
- Detailed result messages with reasons

## 🔐 Permission System

### Permission Types

| Permission | File | Directory |
|-----------|------|-----------|
| **Read (r)** | View file contents | List directory contents |
| **Write (w)** | Modify/delete file | Create/delete files in directory |
| **Execute (x)** | Run as program | Traverse directory |

### Permission Representation

```
rwx = All permissions (7)
rw- = Read + Write (6)
r-x = Read + Execute (5)
r-- = Read only (4)
-w- = Write only (2)
--x = Execute only (1)
--- = No permissions (0)
```

### Access Rules

1. **Owner**: Always has full access (rwx)
2. **Other Users**: Permissions determined by ACL entries
3. **No Entry**: Implies no permissions (---)

## 💾 Data Structure

### User Object
```javascript
{
  id: "user-username",
  name: "username",
  createdAt: "2024-01-15T10:30:00Z"
}
```

### File Object
```javascript
{
  id: "file-timestamp",
  name: "filename.txt",
  ownerId: "user-owner",
  ownerName: "owner",
  type: "file",
  size: 2048,
  createdAt: "2024-01-15T10:30:00Z"
}
```

### Permission Entry
```javascript
{
  userId: "user-alice",
  resourceId: "file-report.txt",
  resourceType: "file",
  permissions: "rwx",
  createdAt: "2024-01-15T10:30:00Z"
}
```

### Audit Log Entry
```javascript
{
  timestamp: "2024-01-15T10:30:00Z",
  action: "PERMISSION_ASSIGN",
  resourceId: "file-id",
  details: "Permissions set to rwx for username"
}
```

## 🔄 Access Control Flow

```
User requests access to File with Action (read/write/execute)
    ↓
Is user the file owner?
    ├─ Yes → Grant access ✓
    └─ No → Continue
         ↓
    Find ACL entry for (user, file)
         ├─ Not found → Deny access ✗
         └─ Found → Check permission bit
              ├─ Bit set → Grant access ✓
              └─ Bit not set → Deny access ✗
```

## 📚 Example Scenarios

### Scenario 1: Team Project
```
File: project.pdf (Owner: alice)
─────────────────────────────
alice    → rwx  (Full control as owner)
bob      → rw-  (Can read and edit)
charlie  → r--  (Can only read)
dave     → ---  (No access)
```

### Scenario 2: Shared Resources
```
File: shared-config.ini (Owner: admin)
──────────────────────────────────────
admin       → rwx  (Full control)
dev-team    → r--  (Read configuration)
qa-team     → r--  (Read configuration)
guest       → ---  (No access)
```

### Scenario 3: Security-Sensitive Files
```
File: credentials.env (Owner: sysadmin)
───────────────────────────────────────
sysadmin     → rwx  (Owner only)
app-service  → r--  (Read credentials)
developers   → ---  (No access)
auditors     → r--  (Audit purposes)
```

## 🎓 Educational Features

### Learning Concepts
- **Fine-grained access control**: Different permissions for different users
- **Permission inheritance**: Default ownership and access rules
- **Security principles**: Least privilege, access verification
- **Audit trails**: Tracking system operations
- **Real-world scenarios**: Practical permission management

### Interactive Testing
- Test access scenarios before operations
- Immediate feedback on permission checks
- Detailed explanation of denial reasons
- Safe environment for learning

### Visual Indicators
- Color-coded permission badges
- Permission bit visualization
- Status indicators for access results
- User-friendly UI

## 🛠️ Operations Reference

### System Operations

| Operation | Function | Restrictions |
|-----------|----------|--------------|
| Create User | `createUser()` | Username must be unique, 3-16 chars |
| Delete User | `deleteUser(userId)` | Removes all user permissions |
| Create File | `createFile()` | Filename must be unique |
| Delete File | `deleteFile(fileId)` | Owner/admin only |
| Assign Permission | `assignPermissions()` | Owner/admin only |
| Delete Permission | `deletePermission(userId, fileId)` | Cannot remove owner permissions |
| Test Access | `testAccess()` | Read-only operation |
| Generate Report | `generateReport()` | Exports system state |
| Export Data | `exportACLData()` | Downloads JSON file |
| Reset System | `resetAllACL()` | Clears all data |
| Load Demo | `loadDemoData()` | Populates sample data |

## 📊 Demo Data

The system includes a pre-configured demo with:
- **5 Users**: admin, alice, bob, charlie, guest
- **4 Files**: report.txt, project.pdf, notes.txt, data.csv
- **11 ACL Entries**: Various permission combinations
- **Realistic Scenarios**: Demonstrates common access patterns

## 🧪 Testing Access

Use the "Access Test" section to verify permissions:

1. Select a user
2. Select a file
3. Choose an action (Read, Write, Execute)
4. Click "Test"
5. View immediate feedback

Results show:
- ✓ ACCESS GRANTED with reason
- ✗ ACCESS DENIED with reason

## 💾 Data Export

Export system state as JSON:
- User list
- File inventory
- All ACL entries
- Audit log (operation history)

Useful for:
- Backup and recovery
- Analysis and reporting
- Sharing configurations
- Documentation

## 🎨 UI Features

### Dark/Light Theme
- Toggle theme with icon button
- Automatic theme persistence
- Smooth transitions

### Responsive Design
- Mobile-friendly layout
- Adaptive typography
- Touch-friendly controls

### Visual Feedback
- Status pills showing system state
- Color-coded permission indicators
- Smooth animations for updates
- Clear error messages

## 🔒 Security Considerations

### Implementation Principles
1. **Owner validation**: Only owners can modify file permissions
2. **Permission verification**: All operations checked before execution
3. **Audit logging**: Complete operation history maintained
4. **User isolation**: Each user has separate permission set
5. **Default security**: No permissions by default

### Access Validation
- Pre-operation checks on all file operations
- Owner always has full access (rwx)
- Explicit permission checking for other users
- Detailed denial reasons for debugging

## 📖 Educational Guide

For comprehensive understanding of ACL concepts, visit:
- `acl-explanation.html` - Detailed educational content
  - What is ACL?
  - Traditional vs. ACL permissions
  - Benefits and use cases
  - Real-world examples
  - Best practices
  - Implementation details

## 🔧 Technical Details

### Technologies Used
- **HTML5**: Semantic markup
- **Vanilla JavaScript**: Core logic and interactions
- **CSS3**: Styling and animations
- **No external dependencies**: Pure implementation

### Browser Compatibility
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance
- Lightweight and responsive
- Instant permission checks
- Smooth UI updates
- Efficient data structures

## 📝 Code Quality

### Features
- **Clean modular code**: Organized, easy to follow
- **Comprehensive comments**: Detailed explanations
- **Validation**: Input checking at all entry points
- **Error handling**: User-friendly error messages
- **Extensible design**: Easy to add features

### Functions Included
- `createUser()` - User creation
- `deleteUser()` - User removal
- `createFile()` - File creation with owner
- `deleteFile()` - File removal
- `assignPermissions()` - Permission assignment
- `deletePermission()` - Permission removal
- `checkAccess()` - Access validation
- `testAccess()` - Permission testing
- `addAuditLog()` - Operation logging
- `generateReport()` - Report generation
- `exportACLData()` - Data export
- `loadDemoData()` - Demo population
- `resetAllACL()` - System reset

## 🎯 Learning Outcomes

After using this ACL Manager, learners will understand:
- How access control lists work
- Differences between traditional and ACL permissions
- Fine-grained permission management
- Security principles (least privilege, audit trails)
- Real-world file system security
- Permission inheritance and defaults
- Practical access control implementation

## 🤝 Integration

This module integrates seamlessly with the OSLabX File System curriculum:
- Complements traditional file system concepts
- Stands alone as a specialized topic
- Accessible from main OSLabX interface
- Maintains consistent UI/UX patterns
- Compatible with existing modules

## 📞 Support

### Common Issues

**Q: Can I remove owner permissions?**
A: No, the system prevents removing the owner's rwx permissions to maintain file accessibility.

**Q: What happens to permissions if owner is deleted?**
A: All permissions for that user are automatically removed, but files retain their ownership records.

**Q: Can a user have both read and execute without write?**
A: Yes, ACL supports any combination of r, w, x independently.

**Q: How do I reset the system?**
A: Click "Reset All" in the Quick Presets section to clear all data.

## 📚 References

### File System Concepts
- ACL (Access Control List)
- Unix/Linux permissions
- Permission inheritance
- Access control models

### Operating System Topics
- File protection mechanisms
- Security policies
- Privilege management
- Audit logging

---

**Version**: 1.0  
**Last Updated**: January 2024  
**Status**: Production Ready

For more information, visit the educational guide or explore the interactive ACL Manager.
