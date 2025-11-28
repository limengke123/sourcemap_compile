function SourceMapSelector({ sourceMaps, selectedIndex, onSelect }) {
  if (!sourceMaps || sourceMaps.length <= 1) {
    return null
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        选择 SourceMap 文件 ({sourceMaps.length} 个文件):
      </label>
      <select
        value={selectedIndex}
        onChange={(e) => onSelect(parseInt(e.target.value, 10))}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {sourceMaps.map((map, index) => (
          <option key={index} value={index}>
            {map.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default SourceMapSelector

