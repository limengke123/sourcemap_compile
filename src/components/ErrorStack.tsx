import { useState } from 'react'
import type { ParsedStackFrame } from '../types'

interface ErrorStackProps {
  stack: ParsedStackFrame[]
}

function ErrorStack({ stack }: ErrorStackProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0) // 默认展开第一个

  if (!stack || stack.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        未找到匹配的错误栈信息
      </div>
    )
  }

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }
  
  // 格式化文件路径，使其更易读
  const formatFilePath = (path: string): string => {
    if (!path) return ''
    // 移除 ~/scripts/ 前缀
    return path.replace(/^~\/scripts\//, '')
  }

  return (
    <div className="space-y-2">
      {stack.map((item, index) => {
        const isExpanded = expandedIndex === index
        const hasMapping = item.hasMapping && item.originalLine !== null
        
        return (
          <div
            key={index}
            className="border border-gray-300 rounded-md bg-white hover:border-gray-400 transition-colors"
          >
            {/* 错误栈行头部 */}
            <div
              className="flex items-start p-3 cursor-pointer"
              onClick={() => toggleExpand(index)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                    #{index + 1}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {item.functionName || '(anonymous)'}
                  </span>
                </div>
                
                {/* 文件路径和位置 - 类似浏览器开发者工具 */}
                <div className="text-sm text-gray-700 font-mono">
                  {hasMapping ? (
                    <>
                      <span className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                        {formatFilePath(item.source)}
                      </span>
                      <span className="text-gray-500 mx-1">:</span>
                      <span className="text-gray-900 font-semibold">
                        {item.originalLine}
                      </span>
                      <span className="text-gray-500 mx-1">:</span>
                      <span className="text-gray-900 font-semibold">
                        {item.originalColumn || 0}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-600">
                        {formatFilePath(item.source)}
                      </span>
                      <span className="text-gray-500 mx-1">:</span>
                      <span className="text-gray-900 font-semibold">
                        {item.line}
                      </span>
                      <span className="text-gray-500 mx-1">:</span>
                      <span className="text-gray-900 font-semibold">
                        {item.column}
                      </span>
                      <span className="text-orange-600 text-xs ml-2 italic">
                        (未映射)
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* 展开/收起按钮 */}
              <button
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpand(index)
                }}
              >
                <svg
                  className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>

            {/* 详细信息（展开时显示） */}
            {isExpanded && (
              <div className="border-t border-gray-200 bg-gray-50">
                <div className="p-4 space-y-4">
                  {/* 原始源代码位置 - 主要显示 */}
                  {hasMapping ? (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        原始源代码位置
                      </div>
                      <div className="bg-white border border-gray-300 rounded-md overflow-hidden">
                        <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                          <span className="text-blue-600 font-mono text-sm">
                            {formatFilePath(item.source)}
                          </span>
                        </div>
                        <div className="px-3 py-2 font-mono text-sm text-gray-800">
                          <span className="text-gray-500">行 </span>
                          <span className="font-semibold text-gray-900">{item.originalLine}</span>
                          <span className="text-gray-500 mx-2">·</span>
                          <span className="text-gray-500">列 </span>
                          <span className="font-semibold text-gray-900">{item.originalColumn || 0}</span>
                        </div>
                      </div>
                      
                      {/* 编译后位置（辅助信息） */}
                      {item.originalSource !== item.source && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-500 mb-1">
                            编译自:
                          </div>
                          <div className="text-xs text-gray-600 font-mono">
                            {formatFilePath(item.originalSource)}:{item.line}:{item.column}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* 未映射的情况 */
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        编译后位置
                      </div>
                      <div className="bg-white border border-gray-300 rounded-md overflow-hidden">
                        <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                          <span className="text-gray-600 font-mono text-sm">
                            {formatFilePath(item.source)}
                          </span>
                        </div>
                        <div className="px-3 py-2 font-mono text-sm text-gray-800">
                          <span className="text-gray-500">行 </span>
                          <span className="font-semibold text-gray-900">{item.line}</span>
                          <span className="text-gray-500 mx-2">·</span>
                          <span className="text-gray-500">列 </span>
                          <span className="font-semibold text-gray-900">{item.column}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-orange-600 italic">
                        ⚠️ 未找到对应的 sourcemap 文件
                      </div>
                    </div>
                  )}

                  {/* 函数调用信息 */}
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                      函数调用
                    </div>
                    <div className="bg-white border border-gray-300 rounded-md px-3 py-2">
                      <code className="text-sm text-gray-800 font-mono">
                        {item.functionName || '(anonymous)'}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ErrorStack

