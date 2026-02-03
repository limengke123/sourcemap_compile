import { useCallback, useState, useEffect } from 'react'
import {
  extractMapFilesFromZip,
  extractMapFilesFromDirectory,
  processSingleFile,
} from '../utils/fileProcessor'
import type { SourceMapFile } from '../types'
import type { CachedVersion } from '../types/cache'
import {
  listVersions,
  deleteVersion,
  updateVersionName,
  formatSize,
  getTotalCacheSize,
  isIndexedDBAvailable,
  clearAllVersions,
} from '../utils/versionCache'

interface FileUploadProps {
  onFileUpload: (file: SourceMapFile, versionName?: string) => void
  onMultipleFiles: (files: SourceMapFile[], versionName?: string) => void
  onLoadFromCache?: (version: CachedVersion) => void
  currentVersionId?: string | null
  onVersionSaved?: () => void
}

function FileUpload({ onFileUpload, onMultipleFiles, onLoadFromCache, currentVersionId, onVersionSaved }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  // Cache-related state
  const [activeTab, setActiveTab] = useState<'cache' | 'upload'>('upload')
  const [cachedVersions, setCachedVersions] = useState<CachedVersion[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(false)
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null)
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string>('')
  const [totalCacheSize, setTotalCacheSize] = useState<number>(0)
  const [showClearAllConfirm, setShowClearAllConfirm] = useState<boolean>(false)
  const cacheAvailable = isIndexedDBAvailable()

  // Load cached versions
  const loadCachedVersions = useCallback(async () => {
    if (!cacheAvailable) return

    setIsLoadingVersions(true)
    try {
      const result = await listVersions()
      if (result.success) {
        setCachedVersions(result.data)

        // Get total cache size
        const sizeResult = await getTotalCacheSize()
        if (sizeResult.success) {
          setTotalCacheSize(sizeResult.data)
        }
      }
    } catch (error) {
      console.error('Failed to load cached versions:', error)
    } finally {
      setIsLoadingVersions(false)
    }
  }, [cacheAvailable])

  // Load versions on mount
  useEffect(() => {
    loadCachedVersions()
  }, [loadCachedVersions])

  // Reload when switching to cache tab
  useEffect(() => {
    if (activeTab === 'cache') {
      loadCachedVersions()
    }
  }, [activeTab, loadCachedVersions])

  // Auto-switch to cache tab if versions exist (only on initial load)
  useEffect(() => {
    if (cacheAvailable && cachedVersions.length > 0) {
      setActiveTab('cache')
    }
  }, [cacheAvailable, cachedVersions.length])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    setIsProcessing(true)

    try {
      const items = Array.from(e.dataTransfer.items)
      const files = Array.from(e.dataTransfer.files)

      const zipFile = files.find(
        (f) => f.name.endsWith('.zip') || f.type === 'application/zip'
      )

      if (zipFile) {
        const mapFiles = await extractMapFilesFromZip(zipFile)
        if (mapFiles.length > 0) {
          // Use zip filename as version name
          onMultipleFiles(mapFiles, zipFile.name)
        } else {
          alert('No .map files found in ZIP archive')
        }
        return
      }

      if (items.length > 0 && items[0].webkitGetAsEntry) {
        const mapFiles = await extractMapFilesFromDirectory(items)
        if (mapFiles.length > 0) {
          onMultipleFiles(mapFiles)
        } else {
          alert('No .map files found in folder')
        }
        return
      }

      const mapFile = files.find(
        (f) => f.name.endsWith('.map') || f.type === 'application/json'
      )

      if (mapFile) {
        const mapFiles = await processSingleFile(mapFile)
        if (mapFiles.length > 0) {
          onFileUpload(mapFiles[0])
        }
      } else {
        alert('Please upload .map files, JSON files, ZIP archives, or folders containing .map files')
      }
    } catch (error) {
      alert('File processing failed: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsProcessing(false)
    }
  }, [onFileUpload, onMultipleFiles])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setIsProcessing(true)
    try {
      const file = files[0]

      if (file.name.endsWith('.zip') || file.type === 'application/zip') {
        const mapFiles = await extractMapFilesFromZip(file)
        if (mapFiles.length > 0) {
          // Use zip filename as version name
          onMultipleFiles(mapFiles, file.name)
        } else {
          alert('No .map files found in ZIP archive')
        }
      } else if (files.length > 1 || e.target.hasAttribute('webkitdirectory')) {
        const mapFiles: SourceMapFile[] = []
        const filePromises = files
          .filter(f => f.name.endsWith('.map') || f.type === 'application/json')
          .map(file => processSingleFile(file))

        const results = await Promise.allSettled(filePromises)
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.length > 0) {
            mapFiles.push(...result.value)
          }
        })

        if (mapFiles.length > 0) {
          onMultipleFiles(mapFiles)
        } else {
          alert('No .map files found in folder')
        }
      } else {
        const mapFiles = await processSingleFile(file)
        if (mapFiles.length > 0) {
          onFileUpload(mapFiles[0])
        }
      }
    } catch (error) {
      alert('File processing failed: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsProcessing(false)
      e.target.value = ''
    }
  }, [onFileUpload, onMultipleFiles])

  // Handle version deletion
  const handleDeleteVersion = useCallback(async (versionId: string) => {
    const result = await deleteVersion(versionId)
    if (result.success) {
      await loadCachedVersions()
      setDeletingVersionId(null)
      if (selectedVersionId === versionId) {
        setSelectedVersionId(null)
      }
    } else {
      alert('Failed to delete version: ' + result.error)
    }
  }, [loadCachedVersions, selectedVersionId])

  // Handle version rename
  const handleRenameVersion = useCallback(async (versionId: string, newName: string) => {
    const result = await updateVersionName(versionId, newName)
    if (result.success) {
      await loadCachedVersions()
      setEditingVersionId(null)
      setEditingName('')
    } else {
      alert('Failed to rename version: ' + result.error)
    }
  }, [loadCachedVersions])

  // Handle version selection - load immediately
  const handleVersionSelect = useCallback((versionId: string) => {
    if (!onLoadFromCache) return

    const version = cachedVersions.find(v => v.id === versionId)
    if (version) {
      setSelectedVersionId(versionId)
      onLoadFromCache(version)
    }
  }, [cachedVersions, onLoadFromCache])

  // Handle clear all cache
  const handleClearAllCache = useCallback(async () => {
    const result = await clearAllVersions()
    if (result.success) {
      setCachedVersions([])
      setSelectedVersionId(null)
      setShowClearAllConfirm(false)
      setTotalCacheSize(0)
      // Switch to upload tab since no cache exists
      setActiveTab('upload')
    } else {
      alert('Failed to clear cache: ' + result.error)
    }
  }, [])

  // Show cache tab if IndexedDB is available (always show for discoverability)
  const showCacheTab = cacheAvailable
  const hasCachedVersions = cachedVersions.length > 0

  return (
    <div>
      {/* Tabs - only show if cache versions exist */}
      {showCacheTab && (
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('cache')}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeTab === 'cache'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            从缓存加载
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeTab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            上传新文件
          </button>
        </div>
      )}

      {/* Cache Tab Content */}
      {activeTab === 'cache' && showCacheTab && (
        <div className="space-y-3">
          {isLoadingVersions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading versions...</p>
            </div>
          ) : cachedVersions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <p className="text-sm text-gray-600 mb-2">No cached versions yet</p>
              <p className="text-xs text-gray-400">
                Upload files to automatically cache them for future use
              </p>
            </div>
          ) : (
            <>
              {/* Version List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cachedVersions.map((version) => (
                  <div key={version.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all duration-200">
                    <div className="flex items-start gap-3">
                      {/* Radio Button */}
                      <input
                        type="radio"
                        name="version"
                        checked={currentVersionId === version.id}
                        onChange={() => handleVersionSelect(version.id)}
                        className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />

                      {/* Version Info */}
                      <div className="flex-1 min-w-0">
                        {/* Version Name - editable on double-click */}
                        {editingVersionId === version.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => {
                              if (editingName.trim()) {
                                handleRenameVersion(version.id, editingName)
                              } else {
                                setEditingVersionId(null)
                                setEditingName('')
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && editingName.trim()) {
                                handleRenameVersion(version.id, editingName)
                              } else if (e.key === 'Escape') {
                                setEditingVersionId(null)
                                setEditingName('')
                              }
                            }}
                            autoFocus
                            maxLength={20}
                            className="text-sm font-medium text-gray-900 border border-blue-500 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <h3
                            onDoubleClick={() => {
                              setEditingVersionId(version.id)
                              setEditingName(version.name)
                            }}
                            className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                          >
                            {version.name}
                          </h3>
                        )}

                        {/* Metadata */}
                        <p className="text-xs text-gray-500 mt-1">
                          {version.fileCount} files • {formatSize(version.totalSize)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {version.name}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => setDeletingVersionId(version.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Inline Delete Confirmation */}
                    {deletingVersionId === version.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between bg-red-50 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
                        <p className="text-sm text-red-800">确定删除此版本？</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteVersion(version.id)}
                            className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors duration-200"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => setDeletingVersionId(null)}
                            className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors duration-200"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Storage Info and Clear All */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 text-center">
                  Storage: {formatSize(totalCacheSize)} used
                </p>

                {/* Clear All Cache Button */}
                {!showClearAllConfirm ? (
                  <button
                    onClick={() => setShowClearAllConfirm(true)}
                    className="w-full py-2 px-4 text-red-600 text-sm font-medium border border-red-300 rounded-lg hover:bg-red-50 transition-colors duration-200"
                  >
                    Clear All Cache
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800 text-center mb-2">
                      确定清除所有缓存？
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearAllCache}
                        className="flex-1 py-1.5 px-3 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors duration-200"
                      >
                        确认删除
                      </button>
                      <button
                        onClick={() => setShowClearAllConfirm(false)}
                        className="flex-1 py-1.5 px-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors duration-200"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Upload Tab Content */}
      {activeTab === 'upload' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-5 text-center transition-all duration-300
            ${isDragging
              ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 scale-[1.01] shadow-md'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }
          `}
        >
          <div className="flex flex-col items-center">
            <div className={`mb-3 transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}>
              <svg
                className={`w-12 h-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'} transition-colors duration-300`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            {isProcessing ? (
              <div className="text-blue-600">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-2"></div>
                <p className="text-sm font-medium">Processing...</p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-3 text-sm">
                  Drag files here, or
                </p>
                <div className="flex flex-col gap-2 w-full">
                  <label className="cursor-pointer group">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Click to select files
                    </span>
                    <input
                      type="file"
                      accept=".map,.zip,application/json,application/zip"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <label className="cursor-pointer group">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-blue-600 text-sm font-medium rounded-md border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      Or select folder
                    </span>
                    <input
                      type="file"
                      webkitdirectory=""
                      directory=""
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="mt-3 space-y-0.5">
                  <p className="text-xs text-gray-500">
                    Supports <span className="font-medium text-blue-600">.map</span> files, <span className="font-medium text-purple-600">ZIP</span> archives, or folders containing .map files
                  </p>
                  <p className="text-xs text-gray-400">
                    Supports uploading unlimited number of files
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload
