interface ErrorInputProps {
  value: string
  onChange: (value: string) => void
}

function ErrorInput({ value, onChange }: ErrorInputProps) {
  return (
    <div className="h-full flex flex-col">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="请输入错误信息，例如：&#10;Error: Something went wrong&#10;    at Object.fn (http://example.com/bundle.js:1:100)&#10;    at main (http://example.com/bundle.js:2:200)"
        className="w-full flex-1 min-h-[200px] px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 resize-none font-mono text-sm transition-all duration-200 bg-gray-50/50 hover:bg-white hover:border-gray-300"
      />
      <div className="flex items-center gap-1.5 mt-2">
        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-gray-500">
          支持粘贴完整的错误堆栈信息（JSON 或文本格式）
        </p>
      </div>
    </div>
  )
}

export default ErrorInput

