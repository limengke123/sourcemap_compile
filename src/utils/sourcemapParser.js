import { SourceMapConsumer } from 'source-map'

/**
 * 解析错误堆栈中的位置信息
 * 支持格式：
 * - at functionName (file.js:line:column)
 * - at Object.functionName (file.js:line:column)
 * - at http://example.com/file.js:line:column
 */
function parseStackLine(line) {
  const patterns = [
    // at functionName (file.js:line:column)
    /at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/,
    // at file.js:line:column
    /at\s+(.+?):(\d+):(\d+)/,
  ]

  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) {
      if (match.length === 5) {
        // 格式1: at functionName (file.js:line:column)
        return {
          functionName: match[1].trim(),
          source: match[2].trim(),
          line: parseInt(match[3], 10),
          column: parseInt(match[4], 10),
        }
      } else if (match.length === 4) {
        // 格式2: at file.js:line:column
        return {
          functionName: null,
          source: match[1].trim(),
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
        }
      }
    }
  }

  return null
}

/**
 * 使用 sourcemap 解析错误堆栈
 */
export async function parseSourceMap(sourceMapData, errorInfo) {
  return new Promise((resolve, reject) => {
    SourceMapConsumer.with(sourceMapData, null, (consumer) => {
      try {
        const lines = errorInfo.split('\n')
        const results = []

        for (const line of lines) {
          const stackInfo = parseStackLine(line.trim())
          if (!stackInfo || !stackInfo.line || !stackInfo.column) {
            continue
          }

          // 尝试查找原始位置
          // 注意：source-map 库的列号是从 0 开始的，而错误信息通常是从 1 开始的
          const originalPosition = consumer.originalPositionFor({
            line: stackInfo.line,
            column: stackInfo.column - 1, // 转换为 0-based
          })

          if (originalPosition.source) {
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

        resolve(results)
      } catch (error) {
        reject(error)
      }
    })
  })
}

