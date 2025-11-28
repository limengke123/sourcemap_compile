# SourceMap 错误解析工具

一个简洁易用的 SourceMap 错误解析工具，帮助开发者快速定位生产环境中的错误位置。

## 功能特性

- 📁 支持拖拽上传 SourceMap 文件
- 📝 输入错误堆栈信息
- 🔍 自动解析并显示原始源代码位置
- 🎨 简洁美观的 UI 界面

## 技术栈

- **Vite** - 快速的前端构建工具
- **React** - UI 框架
- **Tailwind CSS** - 样式框架
- **source-map** - SourceMap 解析库

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 使用方法

1. 上传 SourceMap 文件：拖拽 `.map` 文件到上传区域，或点击选择文件
2. 输入错误信息：在文本框中粘贴完整的错误堆栈信息
3. 点击"解析错误栈"按钮
4. 查看解析结果：工具会显示每个堆栈帧的原始源代码位置

## 错误信息格式

工具支持以下格式的错误堆栈：

```
Error: Something went wrong
    at Object.fn (http://example.com/bundle.js:1:100)
    at main (http://example.com/bundle.js:2:200)
```

或

```
at http://example.com/file.js:10:5
```

## License

MIT

