import { useState, useCallback } from 'react'
import FileUpload from './components/FileUpload'
import ErrorInput from './components/ErrorInput'
import ErrorStack from './components/ErrorStack'
import ErrorMessage from './components/ErrorMessage'
import { parseSourceMap } from './utils/sourcemapParser'
import type { SourceMapFile, ParsedStackFrame } from './types'

function App() {
  const [sourceMaps, setSourceMaps] = useState<SourceMapFile[]>([])
  const [errorInfo, setErrorInfo] = useState<string>('')
  const [parsedStack, setParsedStack] = useState<ParsedStackFrame[] | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isFileListExpanded, setIsFileListExpanded] = useState<boolean>(false) // 默认折叠

  const handleFileUpload = useCallback((file: SourceMapFile) => {
    // 单个文件上传
    setSourceMaps([file])
    setParsedStack(null)
  }, [])

  const handleMultipleFiles = useCallback((files: SourceMapFile[]) => {
    // 多个文件上传
    setSourceMaps(files)
    setParsedStack(null)
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
    setSourceMaps(prev => prev.filter((_, i) => i !== index))
    setParsedStack(null)
  }, [])

  const handleClearAll = useCallback(() => {
    setSourceMaps([])
    setParsedStack(null)
  }, [])

  const handleParse = useCallback(async () => {
    // 清除之前的错误信息
    setErrorMessage(null)

    if (!sourceMaps || sourceMaps.length === 0) {
      setErrorMessage('请先上传 sourcemap 文件')
      return
    }
    if (!errorInfo.trim()) {
      setErrorMessage('请输入错误信息')
      return
    }

    // 验证所有 sourcemap 文件
    const validMaps = sourceMaps.filter(map => map && map.content)
    if (validMaps.length === 0) {
      setErrorMessage('没有有效的 sourcemap 文件')
      return
    }

    setIsProcessing(true)
    try {
      // 传入所有 sourcemap 文件，系统会自动匹配
      const result = await parseSourceMap(validMaps, errorInfo)
      setParsedStack(result)
      setErrorMessage(null) // 清除错误信息
    } catch (error) {
      console.error('解析失败:', error)
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      // 如果错误信息很长，截断并提示查看控制台
      if (errorMsg.length > 1000) {
        setErrorMessage(
          errorMsg.substring(0, 1000) + '\n\n...（完整错误信息请查看浏览器控制台 F12）'
        )
      } else {
        setErrorMessage(errorMsg)
      }
      setParsedStack(null)
    } finally {
      setIsProcessing(false)
    }
  }, [sourceMaps, errorInfo])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <ErrorMessage 
        message={errorMessage} 
        onClose={() => setErrorMessage(null)} 
      />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            SourceMap 错误解析工具
          </h1>
          <p className="text-gray-600">
            上传 sourcemap 文件并输入错误信息，获取详细的错误栈信息
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              1. 上传 SourceMap 文件
            </h2>
            <FileUpload 
              onFileUpload={handleFileUpload} 
              onMultipleFiles={handleMultipleFiles}
            />
            {sourceMaps.length > 0 && (
              <div className="mt-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsFileListExpanded(!isFileListExpanded)}
                      className="flex items-center gap-2 text-sm text-green-800 font-medium hover:text-green-900 transition-colors"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${isFileListExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <span>✓ 已加载 {sourceMaps.length} 个 SourceMap 文件</span>
                    </button>
                    <div className="flex items-center gap-2">
                      {sourceMaps.length > 1 && (
                        <button
                          onClick={handleClearAll}
                          className="text-xs text-red-600 hover:text-red-700 hover:underline"
                        >
                          清除所有
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {isFileListExpanded && (
                    <>
                      <div className="space-y-2 mt-3">
                        {sourceMaps.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-white rounded px-3 py-2 border border-green-200"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 truncate font-mono">
                                {file.name}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveFile(index)}
                              className="ml-2 flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                              title="移除文件"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      {sourceMaps.length > 1 && (
                        <p className="text-xs text-green-700 mt-2">
                          系统将自动为错误堆栈中的每个文件匹配对应的 sourcemap
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              2. 输入错误信息
            </h2>
            <ErrorInput value={errorInfo} onChange={setErrorInfo} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <button
            onClick={handleParse}
            disabled={isProcessing || sourceMaps.length === 0 || !errorInfo.trim()}
            className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? '解析中...' : '解析错误栈'}
          </button>
        </div>

        {parsedStack && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              解析结果
            </h2>
            <ErrorStack stack={parsedStack} />
          </div>
        )}
      </div>
    </div>
  )
}

export default App

