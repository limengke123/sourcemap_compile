import { useState, useMemo, useEffect } from 'react'
import type { ParsedStackFrame } from '../types'

interface ErrorStackProps {
  stack: ParsedStackFrame[]
}

function ErrorStack({ stack }: ErrorStackProps) {
  // 默认展开前3项（如果stack长度>=3，则展开0,1,2；否则展开所有项）
  const defaultExpanded = useMemo(() => {
    const count = Math.min(3, stack.length)
    return new Set(Array.from({ length: count }, (_, i) => i))
  }, [stack.length])
  
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(defaultExpanded)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // 当 stack 改变时，重置为默认展开前3项
  useEffect(() => {
    setExpandedIndexes(defaultExpanded)
  }, [defaultExpanded])

  if (!stack || stack.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No matching stack trace information found
      </div>
    )
  }

  const toggleExpand = (index: number) => {
    setExpandedIndexes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }
  
  // Format file path for readability
  const formatFilePath = (path: string): string => {
    if (!path) return ''
    // Remove ~/scripts/ prefix
    return path.replace(/^~\/scripts\//, '')
  }

  // Format path to start with /src/
  const formatPathForCopy = (path: string): string => {
    if (!path) return ''
    
    // Remove all relative path prefixes
    let normalized = path
      .replace(/^\.\.\/\.\.\//g, '')
      .replace(/^\.\.\//g, '')
      .replace(/^\.\//g, '')
      .replace(/^~\/scripts\//, '')
    
    // Remove all leading relative paths (may have multiple layers)
    while (normalized.startsWith('../')) {
      normalized = normalized.substring(3)
    }
    
    // Find src directory position
    const srcIndex = normalized.indexOf('/src/')
    const srcIndexAlt = normalized.indexOf('src/')
    
    if (srcIndex !== -1) {
      // Found /src/, keep from /src/ onwards
      normalized = normalized.substring(srcIndex)
    } else if (srcIndexAlt !== -1) {
      // Found src/ (without leading slash), add leading slash
      normalized = '/' + normalized.substring(srcIndexAlt)
    }
    // If no src in path, use cleaned path, ensure starts with /
    else if (!normalized.startsWith('/')) {
      normalized = '/' + normalized
    }
    
    return normalized
  }

  // Copy to clipboard
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
      
      // Show copy success indicator
      setCopiedIndex(index)
      setTimeout(() => {
        setCopiedIndex(null)
      }, 2000)
    } catch (error) {
      // Fallback: use traditional method
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
      }
    }
  }

  return (
    <div className="space-y-2">
      {stack.map((item, index) => {
        const isExpanded = expandedIndexes.has(index)
        const hasMapping = item.hasMapping && item.originalLine !== null
        
        return (
          <div
            key={index}
            className={`border rounded-lg bg-white transition-all duration-200 ${
              isExpanded 
                ? 'border-blue-300 shadow-md bg-gradient-to-br from-white to-blue-50/30' 
                : 'border-gray-300 hover:border-gray-400 hover:shadow-sm'
            }`}
          >
            {/* Stack frame header */}
            <div
              className={`flex items-start p-3 cursor-pointer transition-colors ${
                isExpanded ? 'bg-blue-50/50' : ''
              }`}
              onClick={() => toggleExpand(index)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono bg-gray-100 px-2 py-0.5 rounded flex-shrink-0 transition-all duration-200 ${
                    isExpanded 
                      ? 'text-sm font-bold text-gray-700 bg-blue-100' 
                      : 'text-xs text-gray-500'
                  }`}>
                    #{index + 1}
                  </span>
                  <span className="font-semibold text-gray-900 truncate">
                    {item.functionName || '(anonymous)'}
                  </span>
                </div>
                
                {/* File path and location - similar to browser dev tools */}
                <div className="flex items-start gap-2 min-w-0">
                  <div className="text-sm text-gray-700 font-mono min-w-0 flex-1 break-all">
                    {hasMapping ? (
                      <>
                        <span className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer break-all">
                          {formatFilePath(item.source)}
                        </span>
                        <span className="text-gray-500 mx-1 flex-shrink-0">:</span>
                        <span className="text-gray-900 font-semibold flex-shrink-0">
                          {item.originalLine}
                        </span>
                        <span className="text-gray-500 mx-1 flex-shrink-0">:</span>
                        <span className="text-gray-900 font-semibold flex-shrink-0">
                          {item.originalColumn || 0}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-600 break-all">
                          {formatFilePath(item.source)}
                        </span>
                        <span className="text-gray-500 mx-1 flex-shrink-0">:</span>
                        <span className="text-gray-900 font-semibold flex-shrink-0">
                          {item.line}
                        </span>
                        <span className="text-gray-500 mx-1 flex-shrink-0">:</span>
                        <span className="text-gray-900 font-semibold flex-shrink-0">
                          {item.column}
                        </span>
                        <span className="text-orange-600 text-xs ml-2 italic flex-shrink-0">
                          (unmapped)
                        </span>
                      </>
                    )}
                  </div>
                  {/* Copy button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(item, index)
                    }}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 transition-all duration-200 rounded-lg hover:bg-gray-100"
                    title="Copy file path"
                  >
                    {copiedIndex === index ? (
                      <svg
                        className="w-5 h-5 text-green-600"
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
                        className="w-5 h-5"
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
              
              {/* Expand/collapse button */}
              <button
                className="ml-2 flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 transition-all duration-200 rounded-lg hover:bg-gray-100"
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

            {/* Detailed information (shown when expanded) */}
            {isExpanded && (
              <div className="border-t-2 border-blue-200 bg-gradient-to-br from-gray-50 to-blue-50/20">
                <div className="p-4 space-y-4">
                  {/* Compiled from and Function Call - merged into one line */}
                  <div className="text-xs text-gray-500">
                    {hasMapping && item.originalSource !== item.source && (
                      <>
                        Compiled from: <span className="text-gray-600 font-mono">{formatFilePath(item.originalSource)}:{item.line}:{item.column}</span>
                        <span className="mx-2">·</span>
                      </>
                    )}
                    Function: <span className="text-gray-600 font-mono">{item.functionName || '(anonymous)'}</span>
                  </div>
                  
                  {!hasMapping && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        Compiled Location
                      </div>
                      <div className="bg-white border border-gray-300 rounded-md overflow-hidden">
                        <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 break-all">
                          <span className="text-gray-600 font-mono text-sm break-all">
                            {formatFilePath(item.source)}
                          </span>
                        </div>
                        <div className="px-3 py-2 font-mono text-sm text-gray-800">
                          <span className="text-gray-500">Line </span>
                          <span className="font-semibold text-gray-900">{item.line}</span>
                          <span className="text-gray-500 mx-2">·</span>
                          <span className="text-gray-500">Column </span>
                          <span className="font-semibold text-gray-900">{item.column}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-orange-600 italic">
                        ⚠️ No matching sourcemap file found
                      </div>
                    </div>
                  )}

                  {/* Source code content display */}
                  {hasMapping && item.content && (
                    <div>
                      <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-800 px-3 py-2 border-b border-gray-700 flex items-center justify-between">
                          <span className="text-xs text-gray-400 font-mono">
                            {formatFilePath(item.source)}
                          </span>
                          <span className="text-xs text-gray-500">
                            Line {item.originalLine}
                          </span>
                        </div>
                        <div className="p-4 overflow-x-auto">
                          <pre className="text-sm text-gray-100 font-mono leading-relaxed">
                            <code>
                              {(() => {
                                const lines = item.content.split('\n')
                                const targetLine = item.originalLine || 1
                                // originalLine is 1-based, convert to array index (0-based)
                                const targetLineIndex = targetLine - 1
                                const startLine = Math.max(0, targetLineIndex - 5)
                                const endLine = Math.min(lines.length, targetLineIndex + 6)
                                const contextLines = lines.slice(startLine, endLine)
                                
                                return contextLines.map((line, idx) => {
                                  const lineNum = startLine + idx + 1
                                  const isTargetLine = lineNum === targetLine
                                  
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex py-0.5 ${
                                        isTargetLine 
                                          ? 'bg-yellow-900/30 border-l-2 border-yellow-500 pl-2 -ml-2' 
                                          : 'pl-2'
                                      }`}
                                    >
                                      <span className={`text-xs w-12 text-right pr-3 select-none ${
                                        isTargetLine ? 'text-yellow-400 font-bold' : 'text-gray-500'
                                      }`}>
                                        {lineNum}
                                      </span>
                                      <span className={`flex-1 ${isTargetLine ? 'text-yellow-200 font-semibold' : 'text-gray-300'}`}>
                                        {line || ' '}
                                      </span>
                                    </div>
                                  )
                                })
                              })()}
                            </code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
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

