export interface SourceMapFile {
  name: string
  content: any // source-map SourceMap type
}

export interface StackFrame {
  filename: string
  function: string | null
  line: number
  column: number
}

export interface ParsedStackFrame {
  functionName: string
  source: string
  originalSource: string
  originalLine: number | null
  originalColumn: number | null
  line: number
  column: number
  hasMapping: boolean
  content: string | null // Original source code content
}

