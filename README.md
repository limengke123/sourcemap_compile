# 🔍 TraceMap - SourceMap Error Parser

> **Transform cryptic production errors into readable source code locations** 🚀

TraceMap is a powerful, user-friendly web application that helps developers quickly locate and debug production errors by parsing SourceMap files. No more guessing where errors occur in your minified code!

## ✨ Features

- 📁 **Drag & Drop Support** - Easily upload SourceMap files by dragging and dropping
- 📦 **ZIP Archive Support** - Upload entire SourceMap archives in one go
- 📝 **Multiple File Formats** - Supports individual `.map` files, directories, and ZIP archives
- 🔍 **Intelligent Parsing** - Automatically extracts and displays original source code locations
- 🎨 **Beautiful UI** - Clean, modern interface built with Tailwind CSS
- 📋 **One-Click Copy** - Copy parsed stack traces with a single click
- ⚡ **Fast & Lightweight** - Built with Vite for optimal performance

## 🛠️ Tech Stack

- **⚡ Vite** - Lightning-fast build tool
- **⚛️ React 18** - Modern UI framework
- **🎨 Tailwind CSS** - Utility-first CSS framework
- **📦 source-map** - SourceMap parsing library
- **📝 TypeScript** - Type-safe development

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install
# or
npm install
```

### Development

```bash
# Start development server
pnpm dev
# or
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
# Build for production
pnpm build
# or
npm run build

# Build and create ZIP package
pnpm build:zip
# or
npm run build:zip
```

### Preview Production Build

```bash
pnpm preview
# or
npm run preview
```

## 📖 How to Use

### Step 1: Upload SourceMap Files

You can upload SourceMap files in three ways:

- **Drag & Drop**: Drag `.map` files directly onto the upload area
- **Directory Upload**: Drag an entire folder containing SourceMap files
- **ZIP Archive**: Upload a ZIP file containing multiple SourceMap files

### Step 2: Enter Error Stack Trace

Paste your error stack trace into the input field. The tool supports various formats:

**Standard Error Format:**
```
Error: Something went wrong
    at Object.fn (http://example.com/bundle.js:1:100)
    at main (http://example.com/bundle.js:2:200)
    at HTMLButtonElement.onclick (http://example.com/bundle.js:3:300)
```

**Simple Stack Format:**
```
at http://example.com/file.js:10:5
at http://example.com/utils.js:25:15
```

### Step 3: Parse & View Results

Click the **"Parse Stack Trace"** button and watch as the tool:

- 🔍 Analyzes each stack frame
- 📍 Maps minified locations to original source code
- 📋 Displays file paths, line numbers, and column numbers
- 🎯 Highlights the exact error location

### Step 4: Copy Results

Use the **"Copy All"** button to copy the entire parsed stack trace for easy sharing or documentation.

## 🎯 Use Cases

- 🐛 **Debug Production Errors** - Quickly locate bugs in production without source maps in the browser
- 📊 **Error Reporting** - Parse error reports from monitoring tools
- 🔧 **Code Review** - Understand error context during code reviews
- 📝 **Documentation** - Generate readable error reports for team members

## 📋 Supported Formats

- ✅ Individual `.map` files
- ✅ Multiple `.map` files (directory upload)
- ✅ ZIP archives containing `.map` files
- ✅ Standard JavaScript error stack traces
- ✅ Chrome DevTools stack traces
- ✅ Node.js error stack traces

## 🏗️ Project Structure

```
sourcemap-compile/
├── src/
│   ├── components/      # React components
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript types
│   └── App.tsx         # Main application
├── scripts/
│   └── zip-dist.js     # Build script for ZIP packaging
└── public/             # Static assets
```

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

**Made with ❤️ for developers who hate debugging minified code**
