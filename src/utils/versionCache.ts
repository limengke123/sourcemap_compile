import type { SourceMapFile } from '../types'
import type { CachedVersion, CacheOperationResult } from '../types/cache'
import { DB_CONFIG } from '../types/cache'

/**
 * Initialize IndexedDB database and object store
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(DB_CONFIG.storeName)) {
        const objectStore = db.createObjectStore(DB_CONFIG.storeName, {
          keyPath: 'id',
        })

        // Create index on lastUsedAt for sorting
        objectStore.createIndex(DB_CONFIG.indexName, 'lastUsedAt', {
          unique: false,
        })
      }
    }
  })
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}

/**
 * Generate a simple UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Format timestamp to YYYY-MM-DD HH:mm
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * Calculate total size of files in bytes
 */
function calculateTotalSize(files: SourceMapFile[]): number {
  return files.reduce((total, file) => {
    try {
      // Estimate size from JSON stringified content
      const contentStr = JSON.stringify(file.content)
      return total + new Blob([contentStr]).size
    } catch {
      return total
    }
  }, 0)
}

/**
 * Save a new version to cache
 */
export async function saveVersion(
  files: SourceMapFile[],
  customName?: string
): Promise<CacheOperationResult<CachedVersion>> {
  if (!isIndexedDBAvailable()) {
    return {
      success: false,
      error: 'IndexedDB is not available in this browser',
    }
  }

  try {
    const db = await initDB()
    const now = Date.now()

    // Generate default name: use filename if single file, otherwise timestamp
    let defaultName: string
    if (!customName) {
      if (files.length === 1) {
        defaultName = files[0].name
      } else {
        defaultName = formatTimestamp(now)
      }
    } else {
      defaultName = customName
    }

    const version: CachedVersion = {
      id: generateUUID(),
      name: defaultName,
      files,
      uploadedAt: now,
      lastUsedAt: now,
      totalSize: calculateTotalSize(files),
      fileCount: files.length,
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite')
      const store = transaction.objectStore(DB_CONFIG.storeName)
      const request = store.add(version)

      request.onsuccess = () => {
        resolve({ success: true, data: version })
      }

      request.onerror = () => {
        reject(new Error('Failed to save version to cache'))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * List all cached versions sorted by lastUsedAt (most recent first)
 */
export async function listVersions(): Promise<
  CacheOperationResult<CachedVersion[]>
> {
  if (!isIndexedDBAvailable()) {
    return {
      success: false,
      error: 'IndexedDB is not available in this browser',
    }
  }

  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.storeName], 'readonly')
      const store = transaction.objectStore(DB_CONFIG.storeName)
      const index = store.index(DB_CONFIG.indexName)
      const request = index.openCursor(null, 'prev') // 'prev' for descending order

      const versions: CachedVersion[] = []

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          versions.push(cursor.value)
          cursor.continue()
        } else {
          resolve({ success: true, data: versions })
        }
      }

      request.onerror = () => {
        reject(new Error('Failed to list versions from cache'))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get a specific version by ID
 */
export async function getVersion(
  id: string
): Promise<CacheOperationResult<CachedVersion>> {
  if (!isIndexedDBAvailable()) {
    return {
      success: false,
      error: 'IndexedDB is not available in this browser',
    }
  }

  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.storeName], 'readonly')
      const store = transaction.objectStore(DB_CONFIG.storeName)
      const request = store.get(id)

      request.onsuccess = () => {
        const version = request.result
        if (version) {
          resolve({ success: true, data: version })
        } else {
          reject(new Error(`Version with id ${id} not found`))
        }
      }

      request.onerror = () => {
        reject(new Error('Failed to get version from cache'))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete a version by ID
 */
export async function deleteVersion(
  id: string
): Promise<CacheOperationResult<void>> {
  if (!isIndexedDBAvailable()) {
    return {
      success: false,
      error: 'IndexedDB is not available in this browser',
    }
  }

  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite')
      const store = transaction.objectStore(DB_CONFIG.storeName)
      const request = store.delete(id)

      request.onsuccess = () => {
        resolve({ success: true, data: undefined })
      }

      request.onerror = () => {
        reject(new Error('Failed to delete version from cache'))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update version name
 */
export async function updateVersionName(
  id: string,
  name: string
): Promise<CacheOperationResult<void>> {
  if (!isIndexedDBAvailable()) {
    return {
      success: false,
      error: 'IndexedDB is not available in this browser',
    }
  }

  // Validate name
  const trimmedName = name.trim()
  if (trimmedName.length === 0) {
    return { success: false, error: 'Version name cannot be empty' }
  }
  if (trimmedName.length > 20) {
    return { success: false, error: 'Version name cannot exceed 20 characters' }
  }

  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite')
      const store = transaction.objectStore(DB_CONFIG.storeName)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const version = getRequest.result
        if (!version) {
          reject(new Error(`Version with id ${id} not found`))
          return
        }

        version.name = trimmedName
        const updateRequest = store.put(version)

        updateRequest.onsuccess = () => {
          resolve({ success: true, data: undefined })
        }

        updateRequest.onerror = () => {
          reject(new Error('Failed to update version name'))
        }
      }

      getRequest.onerror = () => {
        reject(new Error('Failed to get version from cache'))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update lastUsedAt timestamp for a version
 */
export async function updateLastUsed(
  id: string
): Promise<CacheOperationResult<void>> {
  if (!isIndexedDBAvailable()) {
    return {
      success: false,
      error: 'IndexedDB is not available in this browser',
    }
  }

  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite')
      const store = transaction.objectStore(DB_CONFIG.storeName)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const version = getRequest.result
        if (!version) {
          reject(new Error(`Version with id ${id} not found`))
          return
        }

        version.lastUsedAt = Date.now()
        const updateRequest = store.put(version)

        updateRequest.onsuccess = () => {
          resolve({ success: true, data: undefined })
        }

        updateRequest.onerror = () => {
          reject(new Error('Failed to update lastUsedAt timestamp'))
        }
      }

      getRequest.onerror = () => {
        reject(new Error('Failed to get version from cache'))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get the most recently used version
 */
export async function getMostRecentVersion(): Promise<
  CacheOperationResult<CachedVersion | null>
> {
  const result = await listVersions()

  if (!result.success) {
    return result
  }

  const versions = result.data
  if (versions.length === 0) {
    return { success: true, data: null }
  }

  return { success: true, data: versions[0] }
}

/**
 * Get total cache size in bytes
 */
export async function getTotalCacheSize(): Promise<
  CacheOperationResult<number>
> {
  const result = await listVersions()

  if (!result.success) {
    return result
  }

  const totalSize = result.data.reduce(
    (sum, version) => sum + version.totalSize,
    0
  )

  return { success: true, data: totalSize }
}

/**
 * Clear all cached versions
 */
export async function clearAllVersions(): Promise<CacheOperationResult<void>> {
  if (!isIndexedDBAvailable()) {
    return {
      success: false,
      error: 'IndexedDB is not available in this browser',
    }
  }

  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite')
      const store = transaction.objectStore(DB_CONFIG.storeName)
      const request = store.clear()

      request.onsuccess = () => {
        resolve({ success: true, data: undefined })
      }

      request.onerror = () => {
        reject(new Error('Failed to clear all versions from cache'))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Format size in bytes to human-readable string
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
