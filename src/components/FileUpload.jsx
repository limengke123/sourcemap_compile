import { useCallback, useState } from 'react'

function FileUpload({ onFileUpload }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const file = files.find(f => f.name.endsWith('.map') || f.type === 'application/json')
    
    if (file) {
      onFileUpload(file)
    } else {
      alert('请上传 .map 文件或 JSON 文件')
    }
  }, [onFileUpload])

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0]
    if (file) {
      onFileUpload(file)
    }
  }, [onFileUpload])

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
        <p className="text-gray-600 mb-2">
          拖拽 sourcemap 文件到这里，或
        </p>
        <label className="cursor-pointer">
          <span className="text-blue-600 hover:text-blue-700 font-medium">
            点击选择文件
          </span>
          <input
            type="file"
            accept=".map,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
        <p className="text-sm text-gray-500 mt-2">
          支持 .map 或 JSON 格式文件
        </p>
      </div>
    </div>
  )
}

export default FileUpload

