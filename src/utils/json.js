export function formatJson(jsonString) {
  try {
    const parsed = JSON.parse(jsonString)
    return {
      success: true,
      formatted: JSON.stringify(parsed, null, 2),
      parsed,
    }
  } catch (e) {
    const match = e.message.match(/position (\d+)/)
    let line = 0
    let column = 0

    if (match) {
      const pos = parseInt(match[1])
      const lines = jsonString.substring(0, pos).split('\n')
      line = lines.length
      column = lines[lines.length - 1].length + 1
    }

    return {
      success: false,
      error: {
        message: `Invalid JSON Line: ${line} Column: ${column}`,
        line,
        column,
      },
    }
  }
}

export function parseJson(jsonString) {
  try {
    return {
      success: true,
      data: JSON.parse(jsonString),
    }
  } catch (e) {
    return {
      success: false,
      error: e.message,
    }
  }
}

export function generateTree(data, depth = 0) {
  if (data === null || typeof data !== 'object') {
    return { type: 'value', value: data }
  }

  if (Array.isArray(data)) {
    return {
      type: 'array',
      children: data.map((item, index) => ({
        key: `[${index}]`,
        value: generateTree(item, depth + 1),
      })),
    }
  }

  return {
    type: 'object',
    children: Object.entries(data).map(([key, value]) => ({
      key,
      value: generateTree(value, depth + 1),
    })),
  }
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
