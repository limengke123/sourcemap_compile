import { useState } from 'react'
import type { ParsedStackFrame } from '../types'

interface ErrorStackProps {
  stack: ParsedStackFrame[]
}

function ErrorStack({ stack }: ErrorStackProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0) // 默认展开第一个
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null) // 记录已复制的索引

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

  // 格式化路径为 /src/ 开头的格式
  const formatPathForCopy = (path: string): string => {
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
  }

  // 复制到剪贴板
  const copyToClipboard = async (item: ParsedStackFrame, index: number) => {
    try {
      const path = formatPathForCopy(item.source)
      const line = item.hasMapping && item.originalLine !== null 
        ? item.originalLine 
        : item.line
      const column = item.hasMapping && item.originalColumn !== null 
        ? item.originalColumn 
        : item.column
      
      const textToCopy = `${path}:${line}:${column}`
      
      await navigator.clipboard.writeText(textToCopy)
      
      // 显示复制成功提示
      setCopiedIndex(index)
      setTimeout(() => {
        setCopiedIndex(null)
      }, 2000)
    } catch (error) {
      console.error('复制失败:', error)
      // 降级方案：使用传统方法
      try {
        const path = formatPathForCopy(item.source)
        const line = item.hasMapping && item.originalLine !== null 
          ? item.originalLine 
          : item.line
        const column = item.hasMapping && item.originalColumn !== null 
          ? item.originalColumn 
          : item.column
        
        const textToCopy = `${path}:${line}:${column}`
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        
        setCopiedIndex(index)
        setTimeout(() => {
          setCopiedIndex(null)
        }, 2000)
      } catch (fallbackError) {
        console.error('降级复制方案也失败:', fallbackError)
      }
    }
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
                <div className="flex items-center gap-2">
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
                  {/* 复制按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(item, index)
                    }}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-gray-100"
                    title="复制文件路径"
                  >
                    {copiedIndex === index ? (
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
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          原始源代码位置
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(item, index)
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-blue-600 transition-colors rounded hover:bg-gray-100"
                          title="复制文件路径"
                        >
                          {copiedIndex === index ? (
                            <>
                              <svg
                                className="w-3 h-3 text-green-600"
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
                              <span className="text-green-600">已复制</span>
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-3 h-3"
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
                              <span>复制</span>
                            </>
                          )}
                        </button>
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

