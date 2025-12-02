import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { SourceMapConsumer } from 'source-map'

// Initialize source-map WASM file
async function initializeSourceMap(): Promise<void> {
  try {
    // Method 1: Load WASM file from public directory
    const wasmResponse = await fetch('/lib/mappings.wasm')
    if (wasmResponse.ok) {
      const wasmBuffer = await wasmResponse.arrayBuffer()
      SourceMapConsumer.initialize({
        'lib/mappings.wasm': wasmBuffer,
      })
      return
    }
    throw new Error('Unable to load WASM from public directory')
  } catch (error) {
    try {
      // Method 2: Load from node_modules (development environment)
      const wasmResponse = await fetch('/node_modules/source-map/lib/mappings.wasm')
      if (wasmResponse.ok) {
        const wasmBuffer = await wasmResponse.arrayBuffer()
        SourceMapConsumer.initialize({
          'lib/mappings.wasm': wasmBuffer,
        })
        return
      }
      throw new Error('Unable to load WASM from node_modules')
    } catch (error2) {
      // Method 3: Use pure JS mode (slower performance but available)
      try {
        SourceMapConsumer.initialize({
          'lib/mappings.wasm': null,
        })
      } catch (e) {
        throw e
      }
    }
  }
}

// Render app after initialization
initializeSourceMap().then(() => {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})

