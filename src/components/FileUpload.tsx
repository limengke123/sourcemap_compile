import { useCallback, useState } from 'react'
import {
  extractMapFilesFromZip,
  extractMapFilesFromDirectory,
  processSingleFile,
} from '../utils/fileProcessor'
import type { SourceMapFile } from '../types'

interface FileUploadProps {
  onFileUpload: (file: SourceMapFile) => void
  onMultipleFiles: (files: SourceMapFile[]) => void
}

function FileUpload({ onFileUpload, onMultipleFiles }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

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

      // Check if it's a ZIP file
      const zipFile = files.find(
        (f) => f.name.endsWith('.zip') || f.type === 'application/zip'
      )

      if (zipFile) {
        // Process ZIP file
        const mapFiles = await extractMapFilesFromZip(zipFile)
        if (mapFiles.length > 0) {
          if (onMultipleFiles) {
            onMultipleFiles(mapFiles)
          } else if (mapFiles.length === 1) {
            onFileUpload(mapFiles[0])
          } else {
            onMultipleFiles(mapFiles)
          }
        } else {
          alert('No .map files found in ZIP archive')
        }
        return
      }

      // Check if it's a folder (via items API)
      if (items.length > 0 && items[0].webkitGetAsEntry) {
        const mapFiles = await extractMapFilesFromDirectory(items)
        if (mapFiles.length > 0) {
          if (onMultipleFiles) {
            onMultipleFiles(mapFiles)
          } else if (mapFiles.length === 1) {
            onFileUpload(mapFiles[0])
          } else {
            onMultipleFiles(mapFiles)
          }
        } else {
          alert('No .map files found in folder')
        }
        return
      }

      // Process single file
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

      // Check if it's a ZIP file
      if (file.name.endsWith('.zip') || file.type === 'application/zip') {
        const mapFiles = await extractMapFilesFromZip(file)
        if (mapFiles.length > 0) {
          if (onMultipleFiles) {
            onMultipleFiles(mapFiles)
          } else if (mapFiles.length === 1) {
            onFileUpload(mapFiles[0])
          } else {
            onMultipleFiles(mapFiles)
          }
        } else {
          alert('No .map files found in ZIP archive')
        }
      } else if (files.length > 1 || e.target.hasAttribute('webkitdirectory')) {
        // Process folder (multiple files)
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
          if (onMultipleFiles) {
            onMultipleFiles(mapFiles)
          } else if (mapFiles.length === 1) {
            onFileUpload(mapFiles[0])
          } else {
            onMultipleFiles(mapFiles)
          }
        } else {
          alert('No .map files found in folder')
        }
      } else {
        // Process single file
        const mapFiles = await processSingleFile(file)
        if (mapFiles.length > 0) {
          onFileUpload(mapFiles[0])
        }
      }
    } catch (error) {
      alert('File processing failed: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsProcessing(false)
      // Reset input to allow selecting the same file again
      e.target.value = ''
    }
  }, [onFileUpload, onMultipleFiles])

  return (
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
  )
}

export default FileUpload

