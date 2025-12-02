import { SourceMapConsumer } from 'source-map'
import type { SourceMapFile, StackFrame, ParsedStackFrame } from '../types'

/**
 * 解析 JSON 格式的错误堆栈
 */
function parseJSONStack(errorInfo: string): StackFrame[] | null {
  try {
    const trimmed = errorInfo.trim()
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      return null
    }
    
    const parsed = JSON.parse(trimmed)
    
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        filename: item.filename || item.source || '',
        function: item.function || item.functionName || null,
        line: item.lineno || item.line || 0,
        column: item.colno || item.column || 0,
      })).filter((item: StackFrame) => item.filename && item.line > 0)
    }
    
    if (parsed.filename && (parsed.lineno || parsed.line)) {
      return [{
        filename: parsed.filename || parsed.source || '',
        function: parsed.function || parsed.functionName || null,
        line: parsed.lineno || parsed.line || 0,
        column: parsed.colno || parsed.column || 0,
      }]
    }
    
    return null
  } catch (e) {
    return null
  }
}

/**
 * 解析文本格式的错误堆栈
 */
function parseTextStack(errorInfo: string): StackFrame[] | null {
  const lines = errorInfo.split('\n')
  const results: StackFrame[] = []
  
  const patterns = [
    /at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/,
    /at\s+(.+?):(\d+):(\d+)/,
    /^(.+?):(\d+):(\d+)$/,
  ]
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern)
      if (match) {
        if (match.length === 5) {
          // at function (file:line:column)
          results.push({
            filename: match[2],
            function: match[1],
            line: parseInt(match[3], 10),
            column: parseInt(match[4], 10),
          })
          break
        } else if (match.length === 4) {
          // file:line:column
          results.push({
            filename: match[1],
            function: null,
            line: parseInt(match[2], 10),
            column: parseInt(match[3], 10),
          })
          break
        }
      }
    }
  }
  
  return results.length > 0 ? results : null
}

/**
 * 从文件名匹配 sourcemap
 */
function findMatchingSourceMap(filename: string, sourceMaps: SourceMapFile[]): SourceMapFile | null {
  if (!filename || !sourceMaps || sourceMaps.length === 0) {
    return null
  }
  
  // 标准化文件名
  const normalize = (name: string): string => {
    return name
      .replace(/^~\/scripts\//, '')
      .replace(/^.*\//, '')
      .replace(/\.js$/, '')
      .toLowerCase()
  }
  
  const targetFile = normalize(filename)
  
  // 遍历所有 sourcemap，找到匹配的
  for (const map of sourceMaps) {
    if (!map.content) continue
    
    const mapFile = map.content.file || ''
    const mapSources = map.content.sources || []
    
    // 检查编译后的文件名
    if (mapFile) {
      const normalizedMapFile = normalize(mapFile)
      if (normalizedMapFile === targetFile || 
          normalizedMapFile.includes(targetFile) || 
          targetFile.includes(normalizedMapFile)) {
        return map
      }
    }
    
    // 检查 sources 列表
    for (const source of mapSources) {
      const normalizedSource = normalize(source)
      if (normalizedSource === targetFile ||
          normalizedSource.includes(targetFile) ||
          targetFile.includes(normalizedSource)) {
        return map
      }
    }
    
    // 检查文件名是否包含在路径中
    if (mapFile && mapFile.includes(targetFile)) {
      return map
    }
    
    for (const source of mapSources) {
      if (source.includes(targetFile) || filename.includes(source.split('/').pop() || '')) {
        return map
      }
    }
  }
  
  return null
}

/**
 * 使用 sourcemap 解析错误堆栈
 */
export async function parseSourceMap(sourceMaps: SourceMapFile[], errorInfo: string): Promise<ParsedStackFrame[]> {
  if (!sourceMaps || sourceMaps.length === 0) {
    throw new Error('请先上传 sourcemap 文件')
  }
  
  if (!errorInfo || !errorInfo.trim()) {
    throw new Error('请输入错误信息')
  }
  
  // 解析错误堆栈
  let stackFrames = parseJSONStack(errorInfo)
  if (!stackFrames) {
    stackFrames = parseTextStack(errorInfo)
  }
  
  if (!stackFrames || stackFrames.length === 0) {
    throw new Error('无法解析错误堆栈。请确保格式正确，例如：\n[{"filename":"file.js","lineno":1,"colno":100}]')
  }
  
  console.log('解析到', stackFrames.length, '个堆栈帧')
  
  // 创建 sourcemap consumer 缓存
  const consumerCache = new Map<any, SourceMapConsumer>()
  
  const getConsumer = async (sourceMapContent: any): Promise<SourceMapConsumer> => {
    if (consumerCache.has(sourceMapContent)) {
      return consumerCache.get(sourceMapContent)!
    }
    
    return new Promise((resolve) => {
      SourceMapConsumer.with(sourceMapContent, null, (consumer) => {
        consumerCache.set(sourceMapContent, consumer)
        resolve(consumer)
      })
    })
  }
  
  // 解析每个堆栈帧
  const results: ParsedStackFrame[] = []
  
  for (const frame of stackFrames) {
    try {
      // 找到匹配的 sourcemap
      const matchedMap = findMatchingSourceMap(frame.filename, sourceMaps)
      
      if (!matchedMap) {
        console.warn('未找到匹配的 sourcemap for:', frame.filename)
        results.push({
          functionName: frame.function || '(anonymous)',
          source: frame.filename,
          originalSource: frame.filename,
          originalLine: null,
          originalColumn: null,
          line: frame.line,
          column: frame.column,
          hasMapping: false,
        })
        continue
      }
      
      // 获取 consumer
      const consumer = await getConsumer(matchedMap.content)
      
      // source-map 库：行号从 1 开始，列号从 0 开始
      // 错误堆栈中的列号通常是从 1 开始的，需要转换为 0-based
      const queryLine = Math.max(1, frame.line)
      const queryColumn = Math.max(0, frame.column - 1) // 转换为 0-based
      
      console.log('开始查询:', {
        filename: frame.filename,
        originalLine: frame.line,
        originalColumn: frame.column,
        queryLine,
        queryColumn,
        sourceMapFile: matchedMap.content.file,
      })
      
      // 智能查询策略：尝试多个列号
      // 因为压缩后的代码可能在同一行有多个映射点，我们需要找到最接近的
      let originalPosition: any = null
      const tryColumns: number[] = []
      
      // 1. 首先尝试精确的列号
      tryColumns.push(queryColumn)
      
      // 2. 如果列号 > 0，尝试列号 0（很多 sourcemap 只在列号 0 有映射）
      if (queryColumn > 0) {
        tryColumns.push(0)
      }
      
      // 3. 尝试附近的列号（±1, ±2）
      if (queryColumn > 1) {
        tryColumns.push(queryColumn - 1)
      }
      if (queryColumn > 2) {
        tryColumns.push(queryColumn - 2)
      }
      tryColumns.push(queryColumn + 1)
      tryColumns.push(queryColumn + 2)
      
      // 去重并排序
      const uniqueColumns = [...new Set(tryColumns)].sort((a, b) => {
        // 优先尝试接近原始列号的
        const diffA = Math.abs(a - queryColumn)
        const diffB = Math.abs(b - queryColumn)
        return diffA - diffB
      })
      
      // 尝试每个列号
      for (const col of uniqueColumns) {
        if (col < 0) continue // 跳过负数
        
        const testPosition = consumer.originalPositionFor({
          line: queryLine,
          column: col,
        })
        
        console.log(`尝试列号 ${col}:`, {
          hasSource: !!testPosition?.source,
          source: testPosition?.source,
          line: testPosition?.line,
          column: testPosition?.column,
        })
        
        // 如果找到了有效的映射，使用它
        if (testPosition && testPosition.source) {
          originalPosition = testPosition
          console.log(`✓ 在列号 ${col} 找到映射`)
          break
        }
      }
      
      // 如果还是找不到，尝试使用 allGeneratedPositionsFor 查找该行的所有映射点
      if (!originalPosition || !originalPosition.source) {
        console.log('尝试查找该行的所有映射点...')
        try {
          // 尝试查找该行是否有任何映射
          // 注意：这个方法需要原始源代码位置，我们反过来用
          // 先尝试查询该行的第一个和最后一个列号
          const firstCol = consumer.originalPositionFor({
            line: queryLine,
            column: 0,
          })
          
          if (firstCol && firstCol.source) {
            originalPosition = firstCol
            console.log('使用列号 0 的映射')
          }
        } catch (e) {
          console.warn('查找映射点时出错:', e)
        }
      }
      
      console.log('最终查询结果:', {
        input: { line: queryLine, column: queryColumn, originalColumn: frame.column },
        output: originalPosition,
        found: !!(originalPosition && originalPosition.source),
      })
      
      if (originalPosition && originalPosition.source) {
        results.push({
          functionName: frame.function || originalPosition.name || '(anonymous)',
          source: originalPosition.source,
          originalSource: frame.filename,
          originalLine: originalPosition.line,
          originalColumn: originalPosition.column !== null ? originalPosition.column + 1 : null,
          line: frame.line,
          column: frame.column,
          hasMapping: true,
        })
      } else {
        // 找不到映射，保留原始信息
        console.warn('未找到映射:', {
          filename: frame.filename,
          line: frame.line,
          column: frame.column,
          queryLine,
          queryColumn,
        })
        results.push({
          functionName: frame.function || '(anonymous)',
          source: frame.filename,
          originalSource: frame.filename,
          originalLine: null,
          originalColumn: null,
          line: frame.line,
          column: frame.column,
          hasMapping: false,
        })
      }
    } catch (error) {
      console.error('解析堆栈帧失败:', error, frame)
      // 出错时仍然保留原始信息
      results.push({
        functionName: frame.function || '(anonymous)',
        source: frame.filename,
        originalSource: frame.filename,
        originalLine: null,
        originalColumn: null,
        line: frame.line,
        column: frame.column,
        hasMapping: false,
      })
    }
  }
  
  if (results.length === 0) {
    throw new Error('未能解析出任何结果')
  }
  
  return results
}

