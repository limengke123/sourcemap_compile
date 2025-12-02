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
      <div className="bg-red-50 border-l-4 border-red-500 rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <h3 className="text-sm font-medium text-red-800 mb-1">
              解析失败
            </h3>
            <div className="text-sm text-red-700 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
              {message}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-4 flex-shrink-0 text-red-500 hover:text-red-700 focus:outline-none transition-colors"
              aria-label="关闭"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
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

