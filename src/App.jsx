import { useState, useCallback } from 'react'
import FileUpload from './components/FileUpload'
import ErrorInput from './components/ErrorInput'
import ErrorStack from './components/ErrorStack'
import ErrorMessage from './components/ErrorMessage'
import SourceMapSelector from './components/SourceMapSelector'
import { parseSourceMap } from './utils/sourcemapParser'

function App() {
  const [sourceMaps, setSourceMaps] = useState([])
  const [selectedMapIndex, setSelectedMapIndex] = useState(0)
  const [errorInfo, setErrorInfo] = useState('')
  const [parsedStack, setParsedStack] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const handleFileUpload = useCallback((file) => {
    // 单个文件上传
    setSourceMaps([file])
    setSelectedMapIndex(0)
    setParsedStack(null)
  }, [])

  const handleMultipleFiles = useCallback((files) => {
    // 多个文件上传
    setSourceMaps(files)
    setSelectedMapIndex(0)
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

    const selectedMap = sourceMaps[selectedMapIndex]
    if (!selectedMap || !selectedMap.content) {
      setErrorMessage('请选择有效的 sourcemap 文件')
      return
    }

    setIsProcessing(true)
    try {
      const result = await parseSourceMap(selectedMap.content, errorInfo, sourceMaps)
      setParsedStack(result)
      setErrorMessage(null) // 清除错误信息
    } catch (error) {
      console.error('解析失败:', error)
      const errorMsg = error.message || '未知错误'
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
  }, [sourceMaps, selectedMapIndex, errorInfo])

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
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    ✓ 已加载 {sourceMaps.length} 个 SourceMap 文件
                  </p>
                </div>
                <SourceMapSelector
                  sourceMaps={sourceMaps}
                  selectedIndex={selectedMapIndex}
                  onSelect={setSelectedMapIndex}
                />
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

