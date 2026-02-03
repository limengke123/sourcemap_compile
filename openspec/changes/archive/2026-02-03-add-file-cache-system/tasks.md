# Implementation Tasks

## Phase 1: Foundation - Version Cache Infrastructure (Priority: High)
- [ ] 1.1 Create `src/types/cache.ts` with CachedVersion interface (id, name, files[], uploadedAt, lastUsedAt, totalSize, fileCount)
- [ ] 1.2 Create `src/utils/versionCache.ts` with IndexedDB wrapper for version operations
- [ ] 1.3 Implement saveVersion(files: SourceMapFile[]) - creates new version entry
- [ ] 1.4 Implement listVersions() - returns all cached versions sorted by lastUsedAt desc
- [ ] 1.5 Implement getVersion(id: string) - retrieves specific version's files
- [ ] 1.6 Implement deleteVersion(id: string) - removes version from cache
- [ ] 1.7 Implement updateVersionName(id: string, name: string) - allows renaming
- [ ] 1.8 Implement updateLastUsed(id: string) - updates lastUsedAt timestamp
- [ ] 1.9 Add IndexedDB schema initialization with error handling
- [ ] 1.10 Add cache size calculation utilities

## Phase 2: Auto-Loading Logic (Priority: High)
- [ ] 2.1 Add useEffect in App.tsx to load cached versions on mount
- [ ] 2.2 Implement getMostRecentVersion() utility function
- [ ] 2.3 Auto-load most recent version's files into App state
- [ ] 2.4 Update lastUsedAt timestamp when version is loaded
- [ ] 2.5 Handle case when no cached versions exist (skip auto-load)
- [ ] 2.6 Add loading state indicator during auto-load

## Phase 3: Integrate Cache UI in FileUpload Card (Priority: High)
- [ ] 3.1 Add tab/toggle interface in FileUpload.tsx - "从缓存加载" vs "上传新文件"
- [ ] 3.2 Create version list display with radio button selection
- [ ] 3.3 Show version metadata: name, file count, total size, full timestamp (YYYY-MM-DD HH:mm)
- [ ] 3.4 Add "删除" button for each version with inline confirmation bar
- [ ] 3.5 Implement version selection handler (radio button click)
- [ ] 3.6 Add "Load Selected Version" action button
- [ ] 3.7 Implement version rename functionality (double-click for inline edit)
- [ ] 3.8 Handle empty cache state (hide "从缓存加载" tab when no versions exist)

## Phase 4: Save New Versions on Upload (Priority: High)
- [ ] 4.1 Modify file upload success handler to call saveVersion()
- [ ] 4.2 Generate default version name from timestamp (e.g., "2026-02-03 14:30")
- [ ] 4.3 Calculate total size and file count for new version
- [ ] 4.4 Show success feedback after version is cached
- [ ] 4.5 Update version list UI immediately after save
- [ ] 4.6 Set new version as currently active/loaded

## Phase 5: Apple-Style UI Updates (Priority: Medium)
- [ ] 5.1 Increase card padding to p-8 for generous spacing
- [ ] 5.2 Use large rounded corners (rounded-2xl) on all cards
- [ ] 5.3 Simplify color scheme - reduce gradients, use solid colors
- [ ] 5.4 Update button styles to flat design with subtle hover effects
- [ ] 5.5 Improve typography hierarchy - larger headings, clear size distinctions
- [ ] 5.6 Add more whitespace between sections (gap-8 instead of gap-5)
- [ ] 5.7 Simplify header design - clean logo, minimal decoration
- [ ] 5.8 Remove excessive shadows, use only subtle shadows (shadow-sm)
- [ ] 5.9 Update color palette to muted tones (gray-100 backgrounds, blue/gray accents)
- [ ] 5.10 Ensure high contrast for text readability
- [ ] 5.11 Add smooth transitions (transition-all duration-200) for interactive elements

## Phase 6: Error Handling and Edge Cases (Priority: Medium)
- [ ] 6.1 Handle IndexedDB quota exceeded - show user-friendly error
- [ ] 6.2 Handle IndexedDB not available - graceful fallback, disable cache features
- [ ] 6.3 Handle corrupted version entry - skip and log error
- [ ] 6.4 Add confirmation dialog for version deletion
- [ ] 6.5 Handle failed cache write - show warning, allow continued use
- [ ] 6.6 Add validation for version name input (max 20 characters, sanitization)

## Phase 7: User Experience Enhancements (Priority: Low)
- [ ] 7.1 Add toast notifications in bottom-right corner for cache operations (save, delete, load)
- [ ] 7.2 Show cache loading indicator during auto-load
- [ ] 7.3 Add empty state message when no versions cached
- [ ] 7.4 Implement keyboard shortcuts (Delete key to remove selected version)
- [ ] 7.5 Add storage usage indicator (X MB used)
- [ ] 7.6 Show "当前使用" badge or green checkmark icon for active version

## Phase 8: Testing and Validation (Priority: Medium)
- [ ] 8.1 Test version save/load across different browsers (Chrome, Firefox, Safari)
- [ ] 8.2 Test auto-load functionality on fresh page load
- [ ] 8.3 Test version deletion and UI updates
- [ ] 8.4 Test version renaming and validation
- [ ] 8.5 Test IndexedDB quota handling
- [ ] 8.6 Test UI responsiveness on mobile devices
- [ ] 8.7 Verify Apple-style design consistency across components

## Phase 9: Documentation (Priority: Low)
- [ ] 9.1 Update README.md with version cache feature documentation
- [ ] 9.2 Add inline code comments for version cache utilities
- [ ] 9.3 Document IndexedDB schema for version storage
- [ ] 9.4 Add browser compatibility notes
- [ ] 9.5 Document version naming conventions