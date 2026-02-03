# Design Document: Version-Based File Cache and Apple-Style UI

## Context
TraceMap requires users to reupload sourcemap files every time they use the application. Each upload session (whether uploading a zip file or multiple individual files) conceptually represents a specific release version of the application being debugged. Users need an efficient way to switch between different release versions without re-uploading files repeatedly.

The current UI is functional but can be enhanced with a cleaner, more minimalist design inspired by Apple's design language - emphasizing simplicity, generous whitespace, and clear typography.

### Constraints
- Must work in modern browsers (Chrome 80+, Firefox 75+, Safari 14+)
- Cannot rely on server-side storage (static deployment to GitHub Pages)
- Must respect browser storage quotas (typically 50-100MB for IndexedDB)
- Must not break existing functionality for users
- Should auto-load most recent version for seamless UX

### Stakeholders
- Frontend developers debugging production errors
- DevOps engineers analyzing error logs
- QA teams testing error scenarios across multiple releases

## Goals / Non-Goals

### Goals
- Enable persistent storage of uploaded sourcemap file collections as versioned releases
- Automatically load the most recently used version on application startup
- Allow users to switch between different cached versions
- Provide clear version management (view, select, rename, delete)
- Display full timestamps for version tracking
- Integrate cache UI cleanly within the existing upload card
- Create a clean, minimalist Apple-inspired interface with generous spacing

### Non-Goals
- Server-side file storage or synchronization
- File compression beyond IndexedDB's native handling
- Collaborative features or version sharing
- Advanced cache policies (LRU, automatic expiration) in initial version
- Complex version control features (branching, merging, diffing)
- Material Design or other rich visual styles

## Decisions

### Decision 1: Version-Based Storage Instead of Individual Files
**What**: Group all files from a single upload session into a versioned cache entry

**Why**:
- Matches user mental model (upload session = release version)
- Simplifies version switching (load all files for a version at once)
- Easier to manage and delete (remove entire version vs individual files)
- Aligns with real-world debugging workflow (test against v1.2.3, then v1.2.4)

**Data Structure**:
```typescript
interface CachedVersion {
  id: string                    // UUID v4
  name: string                  // User-editable, defaults to timestamp
  files: SourceMapFile[]        // All files in this version
  uploadedAt: number            // Unix timestamp (ms)
  lastUsedAt: number            // Last accessed timestamp
  totalSize: number             // Total size in bytes
  fileCount: number             // Number of files
}
```

**Alternatives considered**:
- Individual file caching: Rejected because it doesn't match user workflow
- Tag-based system: Rejected as too complex for MVP

### Decision 2: Automatic Loading of Most Recent Version
**What**: On application startup, automatically load the most recently used version

**Why**:
- Reduces friction (no extra click needed)
- Users typically continue working with the same version
- Matches browser behavior (restore last session)
- `lastUsedAt` tracking ensures correct version is loaded

**Trade-offs**:
- May load unwanted version if user wants to switch
- Mitigation: Clear UI showing which version is loaded, easy switching

**Alternatives considered**:
- Always start fresh: Rejected as it defeats the purpose of caching
- Show selection prompt: Rejected as it adds friction

### Decision 3: Integrate Cache UI Within Upload Card
**What**: Add tab/toggle interface inside FileUpload component ("从缓存加载" vs "上传新文件")

**Why**:
- Reduces visual clutter (no new card or panel needed)
- Natural grouping (both are ways to provide files)
- Saves vertical space
- Clear separation of concerns

**UI Pattern**:
```
┌──────────────────────────────────┐
│ [从缓存加载] [上传新文件] ← tabs │
├──────────────────────────────────┤
│ Version list or Upload area      │
└──────────────────────────────────┘
```

**Alternatives considered**:
- Separate cache card: Rejected as it increases visual complexity
- Dropdown menu: Rejected as it hides available versions

### Decision 4: Timestamp Display Format
**What**: Show timestamp in format (YYYY-MM-DD HH:mm) for each version, omitting seconds

**Why**:
- Precise enough for version identification (minute-level accuracy)
- Users requested explicit timestamps without second precision
- Cleaner display, easier to read
- Fits with version management mental model

**Alternatives considered**:
- Full timestamp with seconds (HH:mm:ss): Rejected as unnecessarily precise
- Relative time ("2 hours ago"): Rejected per user feedback
- Date only: Rejected as insufficient when multiple releases occur daily

### Decision 5: Apple-Style Minimalist Design
**What**: Update UI with generous spacing, reduced visual decoration, clean typography

**Why**:
- User explicitly requested Apple-style design
- Reduces cognitive load with simpler visuals
- Professional appearance for developer tool
- Better focus on content and functionality

**Design Principles**:
- Generous whitespace (larger padding, margins)
- Large rounded corners (rounded-2xl: 16px)
- Minimal shadows (shadow-sm or none)
- Solid colors over gradients
- Clear typography hierarchy
- Subtle hover effects
- High contrast for readability

**Alternatives considered**:
- Material Design: Rejected, not user's preference
- Current gradient-heavy style: Too visually busy per user feedback

### Decision 6: User-Editable Version Names with Inline Edit
**What**: Allow users to rename versions via double-click inline editing, with 20 character limit

**Why**:
- Default timestamp names may not be memorable
- Users can add meaningful labels (e.g., "v1.2.3-hotfix", "prod-release")
- Improves organization for frequent users
- Inline editing is intuitive and Apple-style
- 20 character limit prevents UI overflow and encourages concise naming

**Alternatives considered**:
- Modal dialog for rename: Rejected as adding friction
- Auto-detect version from files: Too unreliable, parsing complexity
- Fixed timestamp names: Rejected as less user-friendly
- 50 character limit: Too long, causes UI layout issues

## Technical Architecture

### IndexedDB Schema

```typescript
// Database: TraceMapCache
// Version: 1
// Object Store: cachedVersions

interface CachedVersion {
  id: string                    // Primary key, UUID v4
  name: string                  // User-editable version name
  files: SourceMapFile[]        // Array of {name, content}
  uploadedAt: number            // Unix timestamp (ms)
  lastUsedAt: number            // Unix timestamp (ms), indexed
  totalSize: number             // Total size in bytes
  fileCount: number             // Number of files
}

// Index: by-lastUsed (lastUsedAt, descending)
```

### Component Architecture

```
App.tsx (Modified)
├── State: cachedVersions, currentVersion, isLoadingCache
├── useEffect: Auto-load most recent version on mount
└── FileUpload.tsx (Modified)
    ├── State: activeTab ('cache' | 'upload')
    ├── CacheTab
    │   ├── VersionList
    │   │   └── VersionItem (radio, name, metadata, delete button)
    │   └── LoadButton
    └── UploadTab (existing upload UI)
```

### Data Flow

1. **Application Startup**:
   ```
   App mounts → loadCachedVersions() → getMostRecentVersion()
   → loadVersion(id) → Update App state → updateLastUsed(id)
   ```

2. **Upload New Files**:
   ```
   User uploads → Process files → saveVersion(files)
   → Update cache list → Set as current version
   ```

3. **Switch Version**:
   ```
   User selects version → loadVersion(id) → Update App state
   → updateLastUsed(id) → Close cache tab
   ```

4. **Delete Version**:
   ```
   User clicks delete → Confirm → deleteVersion(id)
   → Update cache list → Clear current if deleted
   ```

### Error Handling

- **Quota exceeded**: Show error, suggest deleting old versions
- **IndexedDB not available**: Disable cache, allow normal upload
- **Corrupted version entry**: Skip entry, log error, continue
- **Failed cache write**: Non-blocking warning, file still usable
- **Auto-load fails**: Log error, show empty state, allow manual upload

## UI/UX Design

### Cache Tab Layout (Within FileUpload Card)

```
┌─────────────────────────────────────────────────┐
│ [从缓存加载 ●] [上传新文件 ○]                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ ● v1.2.3-production    [当前使用]       [删除] │
│   15 files • 18.5 MB                           │
│   2026-02-03 14:30                             │
│                                                 │
│ ○ v1.2.2-hotfix                         [删除] │
│   12 files • 14.2 MB                           │
│   2026-02-01 09:15                             │
│                                                 │
│ ○ 2026-01-28 18:20                     [删除] │
│   10 files • 12.1 MB                           │
│   2026-01-28 18:20                             │
│                                                 │
│           [加载选中版本]                        │
│                                                 │
│ Storage: 42.8 MB used                          │
└─────────────────────────────────────────────────┘

Notes:
- Double-click version name for inline rename (max 20 chars)
- Click [删除] shows inline confirmation bar below item
- "当前使用" badge appears on actively loaded version
- Tab "从缓存加载" hidden when no cached versions exist
```

### Upload Tab Layout (Existing)
```
┌─────────────────────────────────────────────────┐
│ [从缓存加载 ○] [上传新文件 ●]                   │
├─────────────────────────────────────────────────┤
│                                                 │
│         [Drag & Drop Area]                      │
│         or Click to Upload                      │
│                                                 │
│   Supports .map, .zip, folders                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Apple-Style Design Elements

1. **Colors**:
   - Background: White (#FFFFFF) or very light gray (#F9FAFB)
   - Text: Dark gray (#111827) with high contrast
   - Accent: Subtle blue (#3B82F6) for interactive elements
   - Borders: Light gray (#E5E7EB)

2. **Typography**:
   - Headings: Bold, larger size (text-xl to text-2xl)
   - Body: Regular weight, readable size (text-base)
   - Metadata: Smaller, lighter color (text-sm, text-gray-500)

3. **Spacing**:
   - Card padding: p-8 (2rem)
   - Section gaps: gap-8 (2rem)
   - Element spacing: space-y-4 to space-y-6

4. **Rounded Corners**:
   - Cards: rounded-2xl (1rem)
   - Buttons: rounded-lg (0.5rem)
   - Inputs: rounded-lg

5. **Shadows**:
   - Minimal: shadow-sm or none
   - Hover: slight shadow increase (shadow-md)

6. **Buttons**:
   - Primary: Solid blue background, white text
   - Secondary: White background, gray border, dark text
   - Hover: Slight color darkening, no dramatic changes

7. **Transitions**:
   - All interactions: transition-all duration-200
   - Smooth, subtle animations

## Performance Considerations

### Optimization Strategies
1. **Lazy loading**: Load version metadata only, fetch files on demand
2. **Debounced saves**: Prevent rapid successive writes during rename
3. **Efficient queries**: Use IndexedDB indexes for lastUsedAt sorting
4. **Async operations**: All IndexedDB calls non-blocking

### Performance Budgets
- Auto-load on startup: < 500ms
- Version list fetch: < 200ms
- Version switch: < 300ms
- Version save: < 1s per version
- UI update: < 100ms

## Risks / Trade-offs

### Risk: Auto-Load Wrong Version
- **Likelihood**: Low (lastUsedAt tracking is reliable)
- **Impact**: Low (users can quickly switch)
- **Mitigation**:
  - Show which version is loaded prominently
  - Easy access to version switcher

### Risk: Version Name Collisions
- **Likelihood**: Medium (users may use similar names)
- **Impact**: Low (UUIDs ensure uniqueness, names are labels only)
- **Mitigation**:
  - Allow duplicate names (IDs are unique)
  - Show timestamp alongside name

### Risk: Storage Quota Exceeded
- **Likelihood**: Medium (large sourcemaps add up)
- **Impact**: Medium (new versions can't be saved)
- **Mitigation**:
  - Show storage usage indicator
  - Clear error message with suggested action
  - Easy version deletion

### Trade-off: Auto-Load vs Manual Selection
- **Choice**: Auto-load most recent
- **Benefit**: Zero friction, faster workflow
- **Cost**: Slight risk of loading wrong version
- **Rationale**: User explicitly requested auto-load to "avoid extra click"

### Trade-off: Integrated UI vs Separate Panel
- **Choice**: Integrate cache in upload card
- **Benefit**: Cleaner layout, less visual clutter
- **Cost**: Tabs may be less discoverable than separate card
- **Rationale**: User approved integrated approach

## Migration Plan

### Phase 1: Core Functionality (High Priority)
1. Implement version cache infrastructure
2. Add auto-loading logic
3. Integrate cache UI in upload card
4. Version save on upload

### Phase 2: UI Polish (Medium Priority)
5. Apply Apple-style design updates
6. Add transitions and animations
7. Improve spacing and typography

### Phase 3: Enhancements (Low Priority)
7. User experience improvements (toasts, indicators)
8. Testing and validation
9. Documentation

### Rollback Strategy
- Feature flag for cache functionality
- CSS-based UI changes (easy to revert)
- No breaking changes to existing functionality

### Data Migration
- Not applicable (new feature)
- Existing users start with empty cache
- No impact on current workflows

## Open Questions

1. **Should we limit the number of cached versions?**
   - Consideration: Prevent unlimited growth
   - Decision: Show storage usage, rely on user management for MVP

2. **Should version names have character limits?**
   - Consideration: UI layout constraints
   - Decision: ✅ Yes, 20 characters max, validated on input

3. **Should we show version comparison features?**
   - Consideration: Helpful but complex
   - Decision: Not in MVP, potential future enhancement

4. **Should deleted versions be recoverable?**
   - Consideration: Undo functionality
   - Decision: Not in MVP (permanent delete with confirmation)

5. **Should we export/import versions?**
   - Consideration: Cross-device synchronization
   - Decision: Future enhancement, not critical for MVP
