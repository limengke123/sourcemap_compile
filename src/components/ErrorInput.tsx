interface ErrorInputProps {
  value: string
  onChange: (value: string) => void
}

function ErrorInput({ value, onChange }: ErrorInputProps) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="请输入错误信息，例如：&#10;Error: Something went wrong&#10;    at Object.fn (http://example.com/bundle.js:1:100)&#10;    at main (http://example.com/bundle.js:2:200)"
        className="w-full h-48 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-300 resize-none font-mono text-sm transition-all duration-200 bg-gray-50 hover:bg-white hover:border-gray-300"
      />
      <div className="flex items-center gap-2 mt-3">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-gray-500">
          支持粘贴完整的错误堆栈信息（JSON 或文本格式）
        </p>
      </div>
    </div>
  )
}

export default ErrorInput

