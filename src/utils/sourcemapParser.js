import { SourceMapConsumer } from 'source-map-js'

/**
 * 解析错误堆栈中的位置信息
 * 支持格式：
 * - at functionName (file.js:line:column)
 * - at Object.functionName (file.js:line:column)
 * - at http://example.com/file.js:line:column
 * - file.js:line:column
 */
function parseStackLine(line) {
  // 移除前后空白
  const trimmedLine = line.trim()
  if (!trimmedLine) return null

  const patterns = [
    // at functionName (file.js:line:column) - 最常用格式
    {
      regex: /at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/,
      handler: (match) => ({
        functionName: match[1].trim(),
        source: match[2].trim(),
        line: parseInt(match[3], 10),
        column: parseInt(match[4], 10),
      })
    },
    // at Object.functionName (file.js:line:column)
    {
      regex: /at\s+([^\s]+)\s+\((.+?):(\d+):(\d+)\)/,
      handler: (match) => ({
        functionName: match[1].trim(),
        source: match[2].trim(),
        line: parseInt(match[3], 10),
        column: parseInt(match[4], 10),
      })
    },
    // at file.js:line:column (没有函数名)
    {
      regex: /at\s+(.+?):(\d+):(\d+)/,
      handler: (match) => ({
        functionName: null,
        source: match[1].trim(),
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
      })
    },
    // file.js:line:column (没有 at 前缀)
    {
      regex: /^(.+?):(\d+):(\d+)$/,
      handler: (match) => ({
        functionName: null,
        source: match[1].trim(),
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
      })
    },
    // 带行号但没有列号: file.js:line
    {
      regex: /^(.+?):(\d+)$/,
      handler: (match) => ({
        functionName: null,
        source: match[1].trim(),
        line: parseInt(match[2], 10),
        column: 0, // 默认列号为 0
      })
    },
    // at functionName (file.js:line) - 没有列号
    {
      regex: /at\s+(.+?)\s+\((.+?):(\d+)\)/,
      handler: (match) => ({
        functionName: match[1].trim(),
        source: match[2].trim(),
        line: parseInt(match[3], 10),
        column: 0, // 默认列号为 0
      })
    },
  ]

  for (const { regex, handler } of patterns) {
    const match = trimmedLine.match(regex)
    if (match) {
      try {
        const result = handler(match)
        if (result && !isNaN(result.line) && result.line > 0) {
          return result
        }
      } catch (e) {
        console.warn('解析匹配结果失败:', e, match)
      }
    }
  }

  return null
}

/**
 * 解析 JSON 格式的错误堆栈
 * 格式: [{"filename":"file.js","function":"fn","lineno":1,"colno":100}, ...]
 */
function parseJSONStack(errorInfo) {
  try {
    // 尝试解析为 JSON
    const trimmed = errorInfo.trim()
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed)
      // 如果是数组
      if (Array.isArray(parsed)) {
        return parsed.map((item, index) => {
          if (item.filename && (item.lineno !== undefined || item.line !== undefined)) {
            return {
              functionName: item.function || item.functionName || null,
              source: item.filename,
              line: item.lineno || item.line || 0,
              column: item.colno || item.column || 0,
              isJSON: true,
            }
          }
          return null
        }).filter(Boolean)
      }
      // 如果是单个对象
      if (parsed.filename && (parsed.lineno !== undefined || parsed.line !== undefined)) {
        return [{
          functionName: parsed.function || parsed.functionName || null,
          source: parsed.filename,
          line: parsed.lineno || parsed.line || 0,
          column: parsed.colno || parsed.column || 0,
          isJSON: true,
        }]
      }
    }
  } catch (e) {
    // 不是 JSON 格式，返回 null
    return null
  }
  return null
}

/**
 * 根据文件名匹配 sourcemap
 * 尝试从文件名中提取基础名称来匹配
 */
function matchSourceMapByFilename(filename, sourceMapData) {
  if (!filename || !sourceMapData) return true
  
  // 获取 sourcemap 中的源文件列表
  const sources = sourceMapData.sources || []
  const file = filename.replace(/^~\/scripts\//, '').replace(/\.js$/, '')
  
  // 检查是否有匹配的源文件
  const matched = sources.some(source => {
    const sourceFile = source.split('/').pop().replace(/\.js$/, '')
    return sourceFile.includes(file) || file.includes(sourceFile)
  })
  
  return matched || sources.length === 0 // 如果没有 sources 列表，假设匹配
}

/**
 * 使用 sourcemap 解析错误堆栈
 * @param {Object} sourceMapData - sourcemap 数据对象
 * @param {string} errorInfo - 错误堆栈信息（文本或 JSON）
 * @param {Array} allSourceMaps - 所有可用的 sourcemap 文件列表（可选，用于自动匹配）
 */
export async function parseSourceMap(sourceMapData, errorInfo, allSourceMaps = []) {
  try {
    // 验证 sourceMapData 格式
    if (!sourceMapData || typeof sourceMapData !== 'object') {
      throw new Error('无效的 sourcemap 数据格式')
    }

    // 检查 sourcemap 基本结构
    if (!sourceMapData.version || !sourceMapData.mappings) {
      console.warn('SourceMap 可能格式不正确:', {
        hasVersion: !!sourceMapData.version,
        hasMappings: !!sourceMapData.mappings,
        keys: Object.keys(sourceMapData),
      })
    }

    // 显示 sourcemap 信息
    console.log('SourceMap 信息:', {
      version: sourceMapData.version,
      file: sourceMapData.file,
      sources: sourceMapData.sources?.slice(0, 5) || [],
      sourcesCount: sourceMapData.sources?.length || 0,
    })

    // 创建 SourceMapConsumer
    const consumer = await new SourceMapConsumer(sourceMapData)

    try {
      // 首先尝试解析 JSON 格式
      const jsonStack = parseJSONStack(errorInfo)
      if (jsonStack && jsonStack.length > 0) {
        console.log('检测到 JSON 格式的错误堆栈，共', jsonStack.length, '项')
        const results = []
        
        for (const stackInfo of jsonStack) {
          try {
            // 如果提供了多个 sourcemap，尝试找到匹配的
            let currentConsumer = consumer
            let currentSourceMap = sourceMapData
            
            if (allSourceMaps && allSourceMaps.length > 1) {
              // 尝试找到匹配的 sourcemap
              const matchedMap = allSourceMaps.find(map => {
                return matchSourceMapByFilename(stackInfo.source, map.content)
              })
              
              if (matchedMap && matchedMap.content !== sourceMapData) {
                console.log('找到匹配的 sourcemap:', matchedMap.name, 'for', stackInfo.source)
                currentSourceMap = matchedMap.content
                currentConsumer = await new SourceMapConsumer(matchedMap.content)
              }
            }
            
            // 检查文件名是否匹配（如果 sourcemap 有 sources 信息）
            if (!matchSourceMapByFilename(stackInfo.source, currentSourceMap)) {
              console.warn('文件名不匹配，跳过:', {
                stackFile: stackInfo.source,
                sourceMapSources: currentSourceMap.sources?.slice(0, 3),
              })
              results.push({
                functionName: stackInfo.functionName || '(anonymous)',
                source: stackInfo.source,
                originalLine: null,
                originalColumn: null,
                line: stackInfo.line,
                column: stackInfo.column,
                note: '文件名不匹配当前 sourcemap',
              })
              continue
            }

            // source-map 库的行号是从 1 开始，列号是从 0 开始
            const queryLine = Math.max(1, stackInfo.line)
            const queryColumn = Math.max(0, stackInfo.column - 1) // 转换为 0-based
            
            console.log('查询原始位置:', {
              filename: stackInfo.source,
              function: stackInfo.functionName,
              input: { line: queryLine, column: queryColumn },
            })

            const originalPosition = consumer.originalPositionFor({
              line: queryLine,
              column: queryColumn,
            })

            console.log('原始位置查询结果:', {
              input: { line: queryLine, column: queryColumn },
              output: originalPosition,
            })

            if (originalPosition && originalPosition.source) {
              results.push({
                functionName: stackInfo.functionName || originalPosition.name || '(anonymous)',
                source: originalPosition.source,
                originalLine: originalPosition.line,
                originalColumn: originalPosition.column !== null 
                  ? originalPosition.column + 1 
                  : null, // 转换回 1-based
                line: stackInfo.line,
                column: stackInfo.column,
              })
            } else {
              // 如果找不到原始位置，仍然保留原始信息
              console.warn('未找到原始位置映射:', {
                input: { line: queryLine, column: queryColumn },
                output: originalPosition,
              })
              results.push({
                functionName: stackInfo.functionName || '(anonymous)',
                source: stackInfo.source,
                originalLine: null,
                originalColumn: null,
                line: stackInfo.line,
                column: stackInfo.column,
              })
            }
          } catch (positionError) {
            console.warn('解析位置失败，保留原始信息:', positionError, stackInfo)
            results.push({
              functionName: stackInfo.functionName || '(anonymous)',
              source: stackInfo.source,
              originalLine: null,
              originalColumn: null,
              line: stackInfo.line,
              column: stackInfo.column,
            })
          }
        }
        
        console.log('JSON 格式解析完成，找到', results.length, '个结果')
        return results
      }

      // 如果不是 JSON 格式，按文本格式解析
      const lines = errorInfo.split('\n')
      const results = []
      let parsedCount = 0
      const failedLines = []

      console.log('开始解析文本格式错误堆栈，共', lines.length, '行')
      console.log('错误堆栈内容:', errorInfo)

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) {
          continue
        }
        
        const stackInfo = parseStackLine(trimmedLine)
        if (!stackInfo || !stackInfo.line || !stackInfo.column) {
          failedLines.push(trimmedLine)
          console.log('无法解析的行:', trimmedLine)
          continue
        }

        parsedCount++
        console.log('解析堆栈行:', stackInfo)

        try {
          // 尝试查找原始位置
          // 注意：source-map 库的列号是从 0 开始的，而错误信息通常是从 1 开始的
          const originalPosition = consumer.originalPositionFor({
            line: stackInfo.line,
            column: Math.max(0, stackInfo.column - 1), // 转换为 0-based，确保非负数
          })

          console.log('原始位置查询结果:', {
            input: { line: stackInfo.line, column: stackInfo.column - 1 },
            output: originalPosition,
          })

          if (originalPosition && originalPosition.source) {
            results.push({
              functionName: stackInfo.functionName || originalPosition.name || '(anonymous)',
              source: originalPosition.source,
              originalLine: originalPosition.line,
              originalColumn: originalPosition.column !== null 
                ? originalPosition.column + 1 
                : null, // 转换回 1-based
              line: stackInfo.line,
              column: stackInfo.column,
            })
          } else {
            // 如果找不到原始位置，仍然保留原始信息
            console.warn('未找到原始位置，保留原始信息:', stackInfo)
            results.push({
              functionName: stackInfo.functionName || '(anonymous)',
              source: stackInfo.source,
              originalLine: null,
              originalColumn: null,
              line: stackInfo.line,
              column: stackInfo.column,
            })
          }
        } catch (positionError) {
          // 如果单个位置解析失败，仍然保留原始信息
          console.warn('解析位置失败，保留原始信息:', positionError, stackInfo)
          results.push({
            functionName: stackInfo.functionName || '(anonymous)',
            source: stackInfo.source,
            originalLine: null,
            originalColumn: null,
            line: stackInfo.line,
            column: stackInfo.column,
          })
        }
      }

      console.log('解析完成，共解析', parsedCount, '行，找到', results.length, '个结果')
      console.log('无法解析的行数:', failedLines.length)
      if (failedLines.length > 0) {
        console.log('无法解析的行:', failedLines)
      }
      
      if (results.length === 0) {
        const errorMsg = `未能从错误堆栈中解析出任何位置信息。

已尝试解析 ${lines.length} 行，但未找到包含行号和列号的有效堆栈信息。

无法解析的行示例：
${failedLines.slice(0, 5).map(l => `  - ${l}`).join('\n')}

请确保错误堆栈包含以下格式之一：
  - at functionName (file.js:10:5)
  - at Object.method (file.js:20:15)
  - file.js:10:5
  - at http://example.com/file.js:10:5

当前输入的内容：
${errorInfo.substring(0, 500)}${errorInfo.length > 500 ? '...' : ''}`
        throw new Error(errorMsg)
      }

      return results
    } catch (error) {
      throw new Error('解析错误堆栈失败: ' + error.message)
    }
  } catch (error) {
    throw new Error('创建 SourceMapConsumer 失败: ' + error.message)
  }
}

