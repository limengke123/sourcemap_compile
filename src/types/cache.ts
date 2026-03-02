import type { SourceMapFile } from './index'

/**
 * Represents a cached version of uploaded sourcemap files.
 * Each version corresponds to a single upload session (zip or multiple files).
 */
export interface CachedVersion {
  /** Unique identifier (UUID v4) */
  id: string

  /** User-editable version name, defaults to timestamp (max 20 characters) */
  name: string

  /** Array of sourcemap files in this version */
  files: SourceMapFile[]

  /** Upload timestamp in milliseconds (Unix epoch) */
  uploadedAt: number

  /** Last accessed timestamp in milliseconds (Unix epoch) */
  lastUsedAt: number

  /** Total size of all files in bytes */
  totalSize: number

  /** Number of files in this version */
  fileCount: number
}

/**
 * IndexedDB configuration constants
 */
export const DB_CONFIG = {
  name: 'TraceMapCache',
  version: 1,
  storeName: 'cachedVersions',
  indexName: 'by-lastUsed',
} as const

/**
 * Cache operation result types
 */
export type CacheOperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
