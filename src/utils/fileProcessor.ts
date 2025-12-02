import JSZip from 'jszip'
import type { SourceMapFile } from '../types'

/**
 * Extract all .map files from ZIP archive
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
          // Ignore parsing errors
        }
      }
    }
    
    return mapFiles
  } catch (error) {
    throw new Error('ZIP file parsing failed: ' + (error instanceof Error ? error.message : String(error)))
  }
}

/**
 * Extract all .map files from directory
 */
export async function extractMapFilesFromDirectory(items: DataTransferItem[]): Promise<SourceMapFile[]> {
  const mapFiles: SourceMapFile[] = []
  const filePromises: Promise<void>[] = []
  
  // Recursively process all file entries
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
                // Ignore parsing errors
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
  
  // Process all dragged items
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
                // Ignore parsing errors
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
 * Process single file (may be .map file)
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
        reject(new Error('File format error, please upload a valid JSON format sourcemap file'))
      }
    }
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsText(file)
  })
}

