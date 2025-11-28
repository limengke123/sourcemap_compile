function ErrorStack({ stack }) {
  if (!stack || stack.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        未找到匹配的错误栈信息
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {stack.map((item, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="font-semibold text-gray-800 mb-1">
                {item.functionName || '(anonymous)'}
              </div>
              {item.source && (
                <div className="text-sm text-gray-600 font-mono">
                  {item.source}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
              #{index + 1}
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">原始位置:</span>
                <span className="ml-2 font-mono text-gray-800">
                  {item.originalLine}:{item.originalColumn}
                </span>
              </div>
              {item.line && item.column && (
                <div>
                  <span className="text-gray-500">编译后位置:</span>
                  <span className="ml-2 font-mono text-gray-800">
                    {item.line}:{item.column}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ErrorStack

