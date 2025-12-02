import { useEffect } from 'react'

interface ErrorMessageProps {
  message: string | null
  onClose?: () => void
  autoClose?: boolean
  duration?: number
}

function ErrorMessage({ message, onClose, autoClose = true, duration = 5000 }: ErrorMessageProps) {
  if (!message) return null

  // 自动关闭功能
  useEffect(() => {
    if (autoClose && onClose && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [autoClose, duration, onClose])

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-5 fade-in">
      <div className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500 rounded-xl shadow-xl p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-md">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
              <span>解析失败</span>
            </h3>
            <div className="text-sm text-red-700 whitespace-pre-wrap break-words max-h-60 overflow-y-auto bg-white/50 rounded-lg p-2 font-mono text-xs">
              {message}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-200 rounded-lg focus:outline-none transition-all duration-200 transform hover:scale-110"
              aria-label="关闭"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorMessage

