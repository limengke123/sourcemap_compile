import { SourceMapConsumer } from 'source-map'
import type { SourceMapFile, StackFrame, ParsedStackFrame } from '../types'

/**
 * Parse JSON format error stack
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
 * Parse text format error stack
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
 * Match sourcemap from filename
 */
function findMatchingSourceMap(filename: string, sourceMaps: SourceMapFile[]): SourceMapFile | null {
  if (!filename || !sourceMaps || sourceMaps.length === 0) {
    return null
  }
  
  // Extract filename (without path and extension)
  const getBaseName = (path: string): string => {
    // Remove path prefix
    let name = path.replace(/^~\/scripts\//, '')
    // Get filename part
    const lastSlash = name.lastIndexOf('/')
    if (lastSlash !== -1) {
      name = name.substring(lastSlash + 1)
    }
    // Remove extension
    const lastDot = name.lastIndexOf('.')
    if (lastDot !== -1) {
      name = name.substring(0, lastDot)
    }
    return name
  }
  
  const targetBaseName = getBaseName(filename)
  
  // Iterate through all sourcemaps to find match
  for (const map of sourceMaps) {
    if (!map.content) continue
    
    const mapFile = map.content.file || ''
    const mapSources = map.content.sources || []
    
    // 1. Check compiled filename (exact match)
    if (mapFile) {
      const mapBaseName = getBaseName(mapFile)
      if (mapBaseName === targetBaseName) {
        return map
      }
    }
    
    // 2. Check sources list (exact match)
    for (const source of mapSources) {
      const sourceBaseName = getBaseName(source)
      if (sourceBaseName === targetBaseName) {
        return map
      }
    }
  }
  
  return null
}

/**
 * Parse error stack using sourcemap
 */
export async function parseSourceMap(sourceMaps: SourceMapFile[], errorInfo: string): Promise<ParsedStackFrame[]> {
  if (!sourceMaps || sourceMaps.length === 0) {
    throw new Error('Please upload sourcemap files first')
  }
  
  if (!errorInfo || !errorInfo.trim()) {
    throw new Error('Please enter error information')
  }
  
  // Parse error stack
  let stackFrames = parseJSONStack(errorInfo)
  if (!stackFrames) {
    stackFrames = parseTextStack(errorInfo)
  }
  
  if (!stackFrames || stackFrames.length === 0) {
    throw new Error('Unable to parse error stack. Please ensure the format is correct, e.g.:\n[{"filename":"file.js","lineno":1,"colno":100}]')
  }
  
  // Create sourcemap consumer cache
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
  
  // Parse each stack frame
  const results: ParsedStackFrame[] = []
  
  for (const frame of stackFrames) {
    try {
      // Find matching sourcemap
      const matchedMap = findMatchingSourceMap(frame.filename, sourceMaps)
      
      if (!matchedMap) {
        results.push({
          functionName: frame.function || '(anonymous)',
          source: frame.filename,
          originalSource: frame.filename,
          originalLine: null,
          originalColumn: null,
          line: frame.line,
          column: frame.column,
          hasMapping: false,
          content: null,
        })
        continue
      }
      
      // Get consumer
      const consumer = await getConsumer(matchedMap.content)
      
      // source-map library: line numbers start from 1, column numbers start from 0
      // Column numbers in error stacks usually start from 1, need to convert to 0-based
      const queryLine = Math.max(1, frame.line)
      const queryColumn = Math.max(0, frame.column - 1) // Convert to 0-based
      
      // Smart query strategy: try multiple column numbers
      // Because minified code may have multiple mapping points on the same line, we need to find the closest one
      let originalPosition: any = null
      const tryColumns: number[] = []
      
      // 1. First try exact column number
      tryColumns.push(queryColumn)
      
      // 2. If column > 0, try column 0 (many sourcemaps only have mappings at column 0)
      if (queryColumn > 0) {
        tryColumns.push(0)
      }
      
      // 3. Try nearby column numbers (±1, ±2)
      if (queryColumn > 1) {
        tryColumns.push(queryColumn - 1)
      }
      if (queryColumn > 2) {
        tryColumns.push(queryColumn - 2)
      }
      tryColumns.push(queryColumn + 1)
      tryColumns.push(queryColumn + 2)
      
      // Deduplicate and sort
      const uniqueColumns = [...new Set(tryColumns)].sort((a, b) => {
        // Prefer columns closer to original column number
        const diffA = Math.abs(a - queryColumn)
        const diffB = Math.abs(b - queryColumn)
        return diffA - diffB
      })
      
      // Try each column number
      for (const col of uniqueColumns) {
        if (col < 0) continue // Skip negative numbers
        
        const testPosition = consumer.originalPositionFor({
          line: queryLine,
          column: col,
        })
        
        // If found valid mapping, use it
        if (testPosition && testPosition.source) {
          originalPosition = testPosition
          break
        }
      }
      
      // If still not found, try using column 0
      if (!originalPosition || !originalPosition.source) {
        try {
          // Try to find any mapping for this line
          const firstCol = consumer.originalPositionFor({
            line: queryLine,
            column: 0,
          })
          
          if (firstCol && firstCol.source) {
            originalPosition = firstCol
          }
        } catch (e) {
          // Ignore errors
        }
      }
      
      if (originalPosition && originalPosition.source) {
        // Get original source code content
        let sourceContent: string | null = null
        try {
          sourceContent = consumer.sourceContentFor(originalPosition.source)
        } catch (error) {
          // Ignore errors
        }
        
        results.push({
          functionName: frame.function || originalPosition.name || '(anonymous)',
          source: originalPosition.source,
          originalSource: frame.filename,
          originalLine: originalPosition.line,
          originalColumn: originalPosition.column !== null ? originalPosition.column + 1 : null,
          line: frame.line,
          column: frame.column,
          hasMapping: true,
          content: sourceContent,
        })
      } else {
        // Mapping not found, keep original information
        results.push({
          functionName: frame.function || '(anonymous)',
          source: frame.filename,
          originalSource: frame.filename,
          originalLine: null,
          originalColumn: null,
          line: frame.line,
          column: frame.column,
          hasMapping: false,
          content: null,
        })
      }
    } catch (error) {
      // On error, still keep original information
      results.push({
        functionName: frame.function || '(anonymous)',
        source: frame.filename,
        originalSource: frame.filename,
        originalLine: null,
        originalColumn: null,
        line: frame.line,
        column: frame.column,
        hasMapping: false,
        content: null,
      })
    }
  }
  
  if (results.length === 0) {
    throw new Error('No results parsed')
  }
  
  return results
}

