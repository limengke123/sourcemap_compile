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

      // 检查是否是 ZIP 文件
      const zipFile = files.find(
        (f) => f.name.endsWith('.zip') || f.type === 'application/zip'
      )

      if (zipFile) {
        // 处理 ZIP 文件
        const mapFiles = await extractMapFilesFromZip(zipFile)
        if (mapFiles.length > 0) {
          console.log(`成功加载 ${mapFiles.length} 个 sourcemap 文件`)
          if (onMultipleFiles) {
            onMultipleFiles(mapFiles)
          } else if (mapFiles.length === 1) {
            onFileUpload(mapFiles[0])
          } else {
            onMultipleFiles(mapFiles)
          }
        } else {
          alert('ZIP 文件中未找到 .map 文件')
        }
        return
      }

      // 检查是否是文件夹（通过 items API）
      if (items.length > 0 && items[0].webkitGetAsEntry) {
        const mapFiles = await extractMapFilesFromDirectory(items)
        if (mapFiles.length > 0) {
          console.log(`成功加载 ${mapFiles.length} 个 sourcemap 文件`)
          if (onMultipleFiles) {
            onMultipleFiles(mapFiles)
          } else if (mapFiles.length === 1) {
            onFileUpload(mapFiles[0])
          } else {
            onMultipleFiles(mapFiles)
          }
        } else {
          alert('文件夹中未找到 .map 文件')
        }
        return
      }

      // 处理单个文件
      const mapFile = files.find(
        (f) => f.name.endsWith('.map') || f.type === 'application/json'
      )

      if (mapFile) {
        const mapFiles = await processSingleFile(mapFile)
        if (mapFiles.length > 0) {
          onFileUpload(mapFiles[0])
        }
      } else {
        alert('请上传 .map 文件、JSON 文件、ZIP 文件或包含 .map 文件的文件夹')
      }
    } catch (error) {
      alert('文件处理失败: ' + (error instanceof Error ? error.message : String(error)))
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

      // 检查是否是 ZIP 文件
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
          alert('ZIP 文件中未找到 .map 文件')
        }
      } else if (files.length > 1 || e.target.hasAttribute('webkitdirectory')) {
        // 处理文件夹（多个文件）
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
          console.log(`成功加载 ${mapFiles.length} 个 sourcemap 文件`)
          if (onMultipleFiles) {
            onMultipleFiles(mapFiles)
          } else if (mapFiles.length === 1) {
            onFileUpload(mapFiles[0])
          } else {
            onMultipleFiles(mapFiles)
          }
        } else {
          alert('文件夹中未找到 .map 文件')
        }
      } else {
        // 处理单个文件
        const mapFiles = await processSingleFile(file)
        if (mapFiles.length > 0) {
          onFileUpload(mapFiles[0])
        }
      }
    } catch (error) {
      alert('文件处理失败: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsProcessing(false)
      // 重置 input，允许重复选择同一文件
      e.target.value = ''
    }
  }, [onFileUpload, onMultipleFiles])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${isDragging 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
        }
      `}
    >
      <div className="flex flex-col items-center">
        <svg
          className="w-12 h-12 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        {isProcessing ? (
          <div className="text-blue-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>处理中...</p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-2">
              拖拽文件到这里，或
            </p>
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  点击选择文件
                </span>
                <input
                  type="file"
                  accept=".map,.zip,application/json,application/zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  或选择文件夹
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
            <p className="text-sm text-gray-500 mt-2">
              支持 .map 文件、ZIP 压缩包或包含 .map 文件的文件夹
            </p>
            <p className="text-xs text-gray-400 mt-1">
              支持上传任意数量的文件（无限制）
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default FileUpload

