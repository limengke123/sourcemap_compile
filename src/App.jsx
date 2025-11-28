import { useState, useCallback } from 'react'
import FileUpload from './components/FileUpload'
import ErrorInput from './components/ErrorInput'
import ErrorStack from './components/ErrorStack'
import { parseSourceMap } from './utils/sourcemapParser'

function App() {
  const [sourceMap, setSourceMap] = useState(null)
  const [errorInfo, setErrorInfo] = useState('')
  const [parsedStack, setParsedStack] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = useCallback((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target.result)
        setSourceMap(content)
      } catch (error) {
        alert('文件格式错误，请上传有效的 JSON 格式的 sourcemap 文件')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleParse = useCallback(async () => {
    if (!sourceMap) {
      alert('请先上传 sourcemap 文件')
      return
    }
    if (!errorInfo.trim()) {
      alert('请输入错误信息')
      return
    }

    setIsProcessing(true)
    try {
      const result = await parseSourceMap(sourceMap, errorInfo)
      setParsedStack(result)
    } catch (error) {
      alert('解析失败: ' + error.message)
      setParsedStack(null)
    } finally {
      setIsProcessing(false)
    }
  }, [sourceMap, errorInfo])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
            <FileUpload onFileUpload={handleFileUpload} />
            {sourceMap && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  ✓ SourceMap 文件已加载
                </p>
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
            disabled={isProcessing || !sourceMap || !errorInfo.trim()}
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

