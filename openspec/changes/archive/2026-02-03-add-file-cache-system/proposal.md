# Change: Add Version-Based File Cache System and Apple-Style UI

## Why
Users need to reupload sourcemap files every time they use the application, which is inefficient and time-consuming. Each upload session (whether a zip file or multiple files) represents a release version, and users want to switch between different versions efficiently. By adding version-based caching with automatic loading and a clean Apple-inspired interface, users can quickly access previously uploaded file collections.

## What Changes
- Add browser-based persistent storage using IndexedDB that groups files by release version
- Each upload operation creates a versioned cache entry containing all uploaded files
- Automatically load the most recently used version on application startup
- Integrate version selection UI within the file upload card (tab or toggle interface)
- Allow users to switch between cached versions and delete specific versions
- Display full timestamp (YYYY-MM-DD HH:mm:ss) for each version
- Support user-editable version names for easy identification
- Update overall page layout to clean, minimalist Apple-style design
- Implement responsive design with generous whitespace and subtle styling

## Impact
- Affected specs:
  - `file-cache` (NEW) - Version-based file caching system
  - `ui-layout` (NEW) - Apple-style user interface layout
- Affected code:
  - `src/App.tsx` - Main application component, add version cache state management and auto-loading
  - `src/components/FileUpload.tsx` - Integrate version cache UI (tabs/toggle), save and load functionality
  - New file: `src/utils/versionCache.ts` - IndexedDB version cache operations
  - New file: `src/types/cache.ts` - Version cache type definitions
  - `src/index.css` - Apple-style layout improvements (minimal shadows, generous spacing, clean typography)
- Breaking changes: None (additive feature)
- Migration: Existing users will see new cache feature without disruption; most recent session auto-loads
