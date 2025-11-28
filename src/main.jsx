import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { SourceMapConsumer } from 'source-map'

// 初始化 source-map 的 WASM 文件
async function initializeSourceMap() {
  try {
    // 方法1: 从 public 目录加载 WASM 文件
    const wasmResponse = await fetch('/lib/mappings.wasm')
    if (wasmResponse.ok) {
      const wasmBuffer = await wasmResponse.arrayBuffer()
      SourceMapConsumer.initialize({
        'lib/mappings.wasm': wasmBuffer,
      })
      console.log('SourceMap WASM 初始化成功（从 public 目录）')
      return
    }
    throw new Error('无法从 public 目录加载 WASM')
  } catch (error) {
    console.warn('方法1失败，尝试方法2:', error)
    try {
      // 方法2: 从 node_modules 加载（开发环境）
      const wasmResponse = await fetch('/node_modules/source-map/lib/mappings.wasm')
      if (wasmResponse.ok) {
        const wasmBuffer = await wasmResponse.arrayBuffer()
        SourceMapConsumer.initialize({
          'lib/mappings.wasm': wasmBuffer,
        })
        console.log('SourceMap WASM 初始化成功（从 node_modules）')
        return
      }
      throw new Error('无法从 node_modules 加载 WASM')
    } catch (error2) {
      console.warn('SourceMap WASM 初始化失败，将使用纯 JS 模式:', error2)
      // 方法3: 使用纯 JS 模式（性能较差但可用）
      try {
        SourceMapConsumer.initialize({
          'lib/mappings.wasm': null,
        })
        console.log('SourceMap 使用纯 JS 模式（性能可能较慢）')
      } catch (e) {
        console.error('无法初始化 SourceMap:', e)
        throw e
      }
    }
  }
}

// 初始化后再渲染应用
initializeSourceMap().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})

