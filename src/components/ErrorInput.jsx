function ErrorInput({ value, onChange }) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="请输入错误信息，例如：&#10;Error: Something went wrong&#10;    at Object.fn (http://example.com/bundle.js:1:100)&#10;    at main (http://example.com/bundle.js:2:200)"
        className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
      />
      <p className="text-sm text-gray-500 mt-2">
        支持粘贴完整的错误堆栈信息
      </p>
    </div>
  )
}

export default ErrorInput

