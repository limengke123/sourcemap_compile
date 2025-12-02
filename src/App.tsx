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
  const [copiedAll, setCopiedAll] = useState<boolean>(false) // 记录是否复制了全部

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

  // 格式化路径为 /src/ 开头的格式
  const formatPathForCopy = useCallback((path: string): string => {
    if (!path) return ''
    
    // 先移除所有相对路径前缀
    let normalized = path
      .replace(/^\.\.\/\.\.\//g, '') // 移除 ../../ 
      .replace(/^\.\.\//g, '') // 移除 ../
      .replace(/^\.\//g, '') // 移除 ./
      .replace(/^~\/scripts\//, '') // 移除 ~/scripts/
    
    // 移除开头的所有相对路径（可能有多层）
    while (normalized.startsWith('../')) {
      normalized = normalized.substring(3)
    }
    
    // 查找 src 目录的位置
    const srcIndex = normalized.indexOf('/src/')
    const srcIndexAlt = normalized.indexOf('src/')
    
    if (srcIndex !== -1) {
      // 找到 /src/，保留从 /src/ 开始的部分
      normalized = normalized.substring(srcIndex)
    } else if (srcIndexAlt !== -1) {
      // 找到 src/（不带前导斜杠），添加前导斜杠
      normalized = '/' + normalized.substring(srcIndexAlt)
    }
    // 如果路径中没有 src，就使用清理后的路径，确保以 / 开头
    else if (!normalized.startsWith('/')) {
      normalized = '/' + normalized
    }
    
    return normalized
  }, [])

  // 复制所有错误栈
  const copyAllStack = useCallback(async () => {
    if (!parsedStack || parsedStack.length === 0) return

    try {
      const lines = parsedStack.map((item) => {
        const path = formatPathForCopy(item.source)
        const line = item.hasMapping && item.originalLine !== null 
          ? item.originalLine 
          : item.line
        const column = item.hasMapping && item.originalColumn !== null 
          ? item.originalColumn 
          : item.column
        
        return `${path}:${line}:${column}`
      })
      
      const textToCopy = lines.join('\n')
      
      await navigator.clipboard.writeText(textToCopy)
      
      // 显示复制成功提示
      setCopiedAll(true)
      setTimeout(() => {
        setCopiedAll(false)
      }, 2000)
    } catch (error) {
      console.error('复制失败:', error)
      // 降级方案：使用传统方法
      try {
        const lines = parsedStack.map((item) => {
          const path = formatPathForCopy(item.source)
          const line = item.hasMapping && item.originalLine !== null 
            ? item.originalLine 
            : item.line
          const column = item.hasMapping && item.originalColumn !== null 
            ? item.originalColumn 
            : item.column
          
          return `${path}:${line}:${column}`
        })
        
        const textToCopy = lines.join('\n')
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        
        setCopiedAll(true)
        setTimeout(() => {
          setCopiedAll(false)
        }, 2000)
      } catch (fallbackError) {
        console.error('降级复制方案也失败:', fallbackError)
      }
    }
  }, [parsedStack, formatPathForCopy])

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <ErrorMessage 
        message={errorMessage} 
        onClose={() => setErrorMessage(null)} 
      />
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <header className="flex items-center gap-3 mb-6 animate-fade-in">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-md flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
              SourceMap 错误解析工具
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              快速定位生产环境错误位置
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-5 border border-gray-100 animate-slide-up flex flex-col">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center shadow-sm">
                <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                1. 上传 SourceMap 文件
              </h2>
            </div>
            <div className="flex-1">
              <FileUpload 
                onFileUpload={handleFileUpload} 
                onMultipleFiles={handleMultipleFiles}
              />
            </div>
            {sourceMaps.length > 0 && (
              <div className="mt-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsFileListExpanded(!isFileListExpanded)}
                      className="flex items-center gap-2 text-sm text-green-800 font-medium hover:text-green-900 transition-all duration-200 hover:scale-105"
                    >
                      <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${isFileListExpanded ? 'rotate-90' : ''}`}
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
                      <span className="font-semibold">已加载 {sourceMaps.length} 个 SourceMap 文件</span>
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
                  
                  <div 
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                      isFileListExpanded ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'
                    }`}
                    style={{ scrollbarGutter: 'stable' }}
                  >
                    <div className="file-list-scroll space-y-2 max-h-[500px] overflow-y-auto pr-1" style={{ scrollbarGutter: 'stable' }}>
                      {sourceMaps.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-green-200 hover:border-green-300 hover:shadow-md transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-md flex items-center justify-center">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-800 truncate font-mono flex-1 min-w-0">
                              {file.name}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="ml-2 flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100"
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
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-5 border border-gray-100 animate-slide-up flex flex-col" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-md flex items-center justify-center shadow-sm">
                <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                2. 输入错误信息
              </h2>
            </div>
            <div className="flex-1">
              <ErrorInput 
                value={errorInfo} 
                onChange={setErrorInfo}
                onClear={() => setParsedStack(null)}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-5 border border-gray-100 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <button
            onClick={handleParse}
            disabled={isProcessing || sourceMaps.length === 0 || !errorInfo.trim()}
            className="w-full py-3 px-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>解析中...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>解析错误栈</span>
              </>
            )}
          </button>
        </div>

        {parsedStack && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  解析结果
                </h2>
              </div>
              <button
                onClick={copyAllStack}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 transition-all duration-200 rounded-lg hover:bg-blue-50 transform hover:scale-110"
                title="复制所有错误栈"
              >
                {copiedAll ? (
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
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
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
            <ErrorStack stack={parsedStack} />
          </div>
        )}
      </div>
    </div>
  )
}

export default App

