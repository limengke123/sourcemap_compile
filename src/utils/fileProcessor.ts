import JSZip from 'jszip'
import type { SourceMapFile } from '../types'

/**
 * 从 ZIP 文件中提取所有 .map 文件
 */
export async function extractMapFilesFromZip(file: File): Promise<SourceMapFile[]> {
  try {
    const zip = await JSZip.loadAsync(file)
    const mapFiles: SourceMapFile[] = []
    
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir && relativePath.endsWith('.map')) {
        const content = await zipEntry.async('string')
        try {
          const jsonContent = JSON.parse(content)
          mapFiles.push({
            name: relativePath,
            content: jsonContent,
          })
        } catch (e) {
          console.warn(`无法解析文件 ${relativePath}:`, e)
        }
      }
    }
    
    return mapFiles
  } catch (error) {
    throw new Error('ZIP 文件解析失败: ' + (error instanceof Error ? error.message : String(error)))
  }
}

/**
 * 从文件夹中提取所有 .map 文件
 */
export async function extractMapFilesFromDirectory(items: DataTransferItem[]): Promise<SourceMapFile[]> {
  const mapFiles: SourceMapFile[] = []
  const filePromises: Promise<void>[] = []
  
  // 递归处理所有文件项
  async function processEntry(entry: FileSystemEntry): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject)
      })
      
      if (file.name.endsWith('.map') || file.type === 'application/json') {
        filePromises.push(
          new Promise<void>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              try {
                const content = JSON.parse(e.target?.result as string)
                mapFiles.push({
                  name: file.name,
                  content: content,
                })
                resolve()
              } catch (error) {
                console.warn(`无法解析文件 ${file.name}:`, error)
                resolve()
              }
            }
            reader.onerror = () => resolve()
            reader.readAsText(file)
          })
        )
      }
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject)
      })
      
      for (const subEntry of entries) {
        await processEntry(subEntry)
      }
    }
  }
  
  // 处理所有拖拽项
  for (const item of items) {
    if (item.webkitGetAsEntry) {
      const entry = item.webkitGetAsEntry()
      if (entry) {
        await processEntry(entry)
      }
    } else if (item.getAsFile) {
      const file = item.getAsFile()
      if (file && (file.name.endsWith('.map') || file.type === 'application/json')) {
        filePromises.push(
          new Promise<void>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              try {
                const content = JSON.parse(e.target?.result as string)
                mapFiles.push({
                  name: file.name,
                  content: content,
                })
                resolve()
              } catch (error) {
                console.warn(`无法解析文件 ${file.name}:`, error)
                resolve()
              }
            }
            reader.onerror = () => resolve()
            reader.readAsText(file)
          })
        )
      }
    }
  }
  
  await Promise.all(filePromises)
  return mapFiles
}

/**
 * 处理单个文件（可能是 .map 文件）
 */
export function processSingleFile(file: File): Promise<SourceMapFile[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string)
        resolve([{
          name: file.name,
          content: content,
        }])
      } catch (error) {
        reject(new Error('文件格式错误，请上传有效的 JSON 格式的 sourcemap 文件'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

