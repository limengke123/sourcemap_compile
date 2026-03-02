# file-cache Specification

## Purpose
TBD - created by archiving change add-file-cache-system. Update Purpose after archive.
## Requirements
### Requirement: Version-Based File Caching
The system SHALL provide persistent browser-based storage for uploaded sourcemap file collections, organizing them as versioned releases using IndexedDB, allowing users to manage and switch between different release versions.

#### Scenario: Save version on upload
- **WHEN** a user successfully uploads one or more sourcemap files (single upload, multiple files, or zip archive)
- **THEN** the system SHALL save all files as a single versioned cache entry with metadata (id, name, files array, uploadedAt, lastUsedAt, totalSize, fileCount)

#### Scenario: Cache persistence across sessions
- **WHEN** a user closes and reopens the application
- **THEN** the system SHALL load and display all previously cached versions from IndexedDB

#### Scenario: IndexedDB not available
- **WHEN** IndexedDB is not supported or blocked by the browser
- **THEN** the system SHALL gracefully degrade and allow normal file upload without caching features

### Requirement: Version Storage Structure
The system SHALL store cached versions in IndexedDB with a well-defined schema including version metadata and file collections.

#### Scenario: Version entry structure
- **WHEN** files are saved to cache as a version
- **THEN** the system SHALL store an object with properties: id (UUID), name (user-editable string), files (SourceMapFile array), uploadedAt (Unix timestamp ms), lastUsedAt (Unix timestamp ms), totalSize (bytes), fileCount (number)

#### Scenario: Cache database initialization
- **WHEN** the application loads for the first time
- **THEN** the system SHALL create an IndexedDB database named "TraceMapCache" with version 1, an object store "cachedVersions" with primary key "id", and an index "by-lastUsed" on the lastUsedAt field

### Requirement: Automatic Loading of Recent Version
The system SHALL automatically load the most recently used cached version on application startup without user interaction.

#### Scenario: Auto-load most recent version
- **WHEN** the application starts and cached versions exist
- **THEN** the system SHALL retrieve the version with the most recent lastUsedAt timestamp and load its files into the application state

#### Scenario: Update last used timestamp
- **WHEN** a version is loaded (either automatically or manually)
- **THEN** the system SHALL update that version's lastUsedAt field to the current timestamp

#### Scenario: No cached versions available
- **WHEN** the application starts and no cached versions exist
- **THEN** the system SHALL skip auto-loading and display the default empty state

### Requirement: Display Cached Versions
The system SHALL display all cached versions in a list within the file upload card with relevant metadata.

#### Scenario: Display version list
- **WHEN** a user opens the cache tab in the file upload card
- **THEN** the system SHALL display all cached versions sorted by lastUsedAt (most recent first) with name, file count, total size, and full timestamp (YYYY-MM-DD HH:mm)

#### Scenario: Empty cache state
- **WHEN** no versions are cached and the user views the cache tab
- **THEN** the system SHALL display an empty state message encouraging file upload

#### Scenario: Storage usage indicator
- **WHEN** cached versions exist
- **THEN** the system SHALL display total storage used in MB at the bottom of the version list

### Requirement: Select and Load Cached Version
The system SHALL allow users to select and load a specific cached version to use for error parsing.

#### Scenario: Version selection
- **WHEN** a user clicks a version in the cache list
- **THEN** the system SHALL select that version (indicated by radio button or highlight)

#### Scenario: Load selected version action
- **WHEN** a user clicks the "加载选中版本" button
- **THEN** the system SHALL load the selected version's files into the application state, update the version's lastUsedAt timestamp, and switch to the upload tab showing loaded file count

#### Scenario: Visual indication of loaded version
- **WHEN** a version is currently loaded
- **THEN** the system SHALL display a "当前使用" badge or green checkmark icon next to that version in the list

### Requirement: Delete Cached Versions
The system SHALL allow users to delete individual cached versions from browser storage.

#### Scenario: Delete version with inline confirmation
- **WHEN** a user clicks the "删除" button for a specific version
- **THEN** the system SHALL display an inline confirmation bar below the version item with options to confirm or cancel

#### Scenario: Confirm deletion
- **WHEN** a user confirms the deletion in the inline confirmation bar
- **THEN** the system SHALL remove the version from IndexedDB, update the UI to remove the item from the list, collapse the confirmation bar, and display a success toast notification in the bottom-right corner

#### Scenario: Cancel deletion
- **WHEN** a user cancels the deletion in the inline confirmation bar
- **THEN** the system SHALL collapse the confirmation bar without deleting the version

#### Scenario: Delete currently loaded version
- **WHEN** a user deletes the version that is currently loaded
- **THEN** the system SHALL clear the loaded files from application state and show the default empty state

### Requirement: Edit Version Names
The system SHALL allow users to rename cached versions for easier identification.

#### Scenario: Rename version via double-click
- **WHEN** a user double-clicks on a version name
- **THEN** the system SHALL convert the name into an inline editable text input field

#### Scenario: Save new name
- **WHEN** a user enters a new name and presses Enter or clicks outside the input
- **THEN** the system SHALL update the version's name in IndexedDB, refresh the UI to show the new name, and validate that the name is not empty and does not exceed 20 characters

#### Scenario: Default version naming
- **WHEN** a new version is created from file upload
- **THEN** the system SHALL generate a default name based on the upload timestamp in format "YYYY-MM-DD HH:mm"

### Requirement: Integrated Cache UI
The system SHALL integrate version cache management within the file upload card using a tab or toggle interface.

#### Scenario: Tab interface display
- **WHEN** the file upload card is displayed
- **THEN** the system SHALL show two tabs: "从缓存加载" and "上传新文件", with the cache tab showing the version list and the upload tab showing the existing drag-and-drop interface

#### Scenario: Switch between tabs
- **WHEN** a user clicks on a tab
- **THEN** the system SHALL switch the content area to display either the cache version list or the upload interface

#### Scenario: Tab visibility with no cache
- **WHEN** the application loads with no cached versions
- **THEN** the system SHALL hide the "从缓存加载" tab and only display the "上传新文件" content

#### Scenario: Tab visibility with cache
- **WHEN** cached versions exist
- **THEN** the system SHALL display both tabs with "从缓存加载" as the default active tab

### Requirement: Cache Size Management
The system SHALL monitor and display storage usage, warning users when approaching quota limits.

#### Scenario: Display storage usage
- **WHEN** cached versions exist
- **THEN** the system SHALL calculate and display total storage used in human-readable format (MB) at the bottom of the version list

#### Scenario: Quota warning
- **WHEN** cache storage usage exceeds 80% of available IndexedDB quota
- **THEN** the system SHALL display a warning message suggesting users delete old versions

#### Scenario: Quota exceeded error
- **WHEN** attempting to save a new version would exceed IndexedDB quota
- **THEN** the system SHALL display an error message, prevent the save, and suggest deleting existing cached versions

### Requirement: Cache Error Handling
The system SHALL handle cache-related errors gracefully without breaking core application functionality.

#### Scenario: Corrupted version entry
- **WHEN** loading cached versions and encountering a corrupted entry
- **THEN** the system SHALL skip the corrupted entry, log the error to console, and continue loading other valid entries

#### Scenario: Failed cache write
- **WHEN** saving a version to cache fails
- **THEN** the system SHALL display a non-blocking warning notification, log the error, and allow the user to continue using the files without caching

#### Scenario: IndexedDB access denied
- **WHEN** IndexedDB access is denied by browser security policies or private browsing mode
- **THEN** the system SHALL disable cache features, display an informational message once, and allow normal file upload workflow

#### Scenario: Auto-load failure
- **WHEN** auto-loading the most recent version fails
- **THEN** the system SHALL log the error, skip auto-loading, and display the default empty state

### Requirement: Full Timestamp Display
The system SHALL display the full upload timestamp for each cached version for precise identification.

#### Scenario: Timestamp format
- **WHEN** displaying a cached version in the list
- **THEN** the system SHALL show the uploadedAt timestamp in format "YYYY-MM-DD HH:mm"

#### Scenario: Timestamp in version name
- **WHEN** a new version is created with default naming
- **THEN** the system SHALL use the timestamp format "YYYY-MM-DD HH:mm" as the default version name

### Requirement: Toast Notifications for Cache Operations
The system SHALL display toast notifications in the bottom-right corner for cache operation feedback.

#### Scenario: Display success toast
- **WHEN** a cache operation succeeds (save, delete, load)
- **THEN** the system SHALL display a toast notification in the bottom-right corner with success message, fade in animation, and auto-dismiss after 3 seconds

#### Scenario: Display error toast
- **WHEN** a cache operation fails
- **THEN** the system SHALL display a toast notification in the bottom-right corner with error message and red color scheme, auto-dismiss after 5 seconds

#### Scenario: Toast styling
- **WHEN** displaying toast notifications
- **THEN** the system SHALL use simple, clean design with rounded corners (rounded-lg), subtle shadow (shadow-md), white background, and fade in/out transitions

### Requirement: Cache Performance
The system SHALL ensure cache operations do not degrade application performance or responsiveness.

#### Scenario: Auto-load performance
- **WHEN** loading the most recent version on application startup
- **THEN** the system SHALL complete the operation within 500ms

#### Scenario: Version list fetch performance
- **WHEN** displaying the cached version list
- **THEN** the system SHALL fetch version metadata from IndexedDB within 200ms

#### Scenario: Version switch performance
- **WHEN** loading a selected version's files
- **THEN** the system SHALL complete the operation within 300ms

#### Scenario: Non-blocking cache operations
- **WHEN** performing cache reads or writes
- **THEN** the system SHALL use asynchronous operations to prevent UI freezing or input lag

