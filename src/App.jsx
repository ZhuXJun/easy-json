import { useState, useCallback, useEffect, useRef } from 'react'
import Toolbar from './components/Toolbar/Toolbar'
import HistoryPanel from './components/HistoryPanel/HistoryPanel'
import JsonEditor from './components/JsonEditor/JsonEditor'
import JsonTree from './components/JsonTree/JsonTree'
import JsonCompare from './components/JsonCompare/JsonCompare'

// Sort JSON keys recursively by ASCII order
function sortJsonKeys(obj) {
  if (typeof obj !== 'object' || obj === null) return obj
  if (Array.isArray(obj)) return obj.map(item => sortJsonKeys(item))
  const sortedKeys = Object.keys(obj).sort()
  const result = {}
  for (const key of sortedKeys) {
    result[key] = sortJsonKeys(obj[key])
  }
  return result
}

// Compute line-based diff between two JSON strings
function computeLineDiff(text1, text2) {
  try {
    const obj1 = JSON.parse(text1)
    const obj2 = JSON.parse(text2)
    const sorted1 = JSON.stringify(sortJsonKeys(obj1), null, 2)
    const sorted2 = JSON.stringify(sortJsonKeys(obj2), null, 2)
    
    const lines1 = sorted1.split('\n')
    const lines2 = sorted2.split('\n')
    const maxLen = Math.max(lines1.length, lines2.length)
    const diffLines = new Map()
    
    for (let i = 0; i < maxLen; i++) {
      const line1 = i < lines1.length ? lines1[i] : null
      const line2 = i < lines2.length ? lines2[i] : null
      const lineNum = i + 1
      
      if (line1 === line2) {
        // same line
      } else if (line1 === null) {
        diffLines.set(lineNum, 'added')
      } else if (line2 === null) {
        diffLines.set(lineNum, 'removed')
      } else {
        diffLines.set(lineNum, 'modified')
      }
    }
    
    return { diffLines, sortedText: sorted1 }
  } catch (e) {
    return null
  }
}

function App() {
  const [history, setHistory] = useState([])
  const [currentJson, setCurrentJson] = useState('')
  const [parsedJson, setParsedJson] = useState(null)
  const [error, setError] = useState(null)
  const [selectedHistoryId, setSelectedHistoryId] = useState(null)
  const [leftWidth, setLeftWidth] = useState(240)
  const [rightWidth, setRightWidth] = useState(350)
  const [showCompare, setShowCompare] = useState(false)
  const [compareWithId, setCompareWithId] = useState(null)
  const [diffResult, setDiffResult] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const skipUpdateRef = useRef(false)
  const lastSavedRef = useRef('')

  // Load history from file on mount
  useEffect(() => {
    loadHistory()
  }, [])

  // Save history to file when it changes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveHistory(history)
    }, 300)
    return () => clearTimeout(timer)
  }, [history])

  const loadHistory = async () => {
    try {
      const result = await window.electronAPI.loadHistory()
      if (result && result.length > 0) {
        setHistory(result)
        setSelectedHistoryId(result[0].id)
        setCurrentJson(result[0].content)
        parseJsonContent(result[0].content)
      } else {
        // Auto-create a blank document
        const id = Date.now().toString()
        const newItem = {
          id,
          name: 'JSON 1',
          content: '',
          createdAt: Date.now(),
          size: 0,
        }
        setHistory([newItem])
        setSelectedHistoryId(id)
        setCurrentJson('')
        setParsedJson(null)
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  const saveHistory = async (data) => {
    try {
      const dataStr = JSON.stringify(data)
      if (dataStr !== lastSavedRef.current) {
        lastSavedRef.current = dataStr
        await window.electronAPI.saveHistory(data)
      }
    } catch (err) {
      console.error('Failed to save history:', err)
    }
  }

  const parseJsonContent = (jsonString) => {
    if (!jsonString || jsonString.trim() === '') {
      setParsedJson(null)
      setError(null)
      return
    }
    try {
      const parsed = JSON.parse(jsonString)
      setParsedJson(parsed)
      setError(null)
    } catch (e) {
      setParsedJson(null)
      const match = e.message.match(/position (\d+)/)
      if (match) {
        const pos = parseInt(match[1])
        const lines = jsonString.substring(0, pos).split('\n')
        const line = lines.length
        const column = lines[lines.length - 1].length + 1
        setError({ message: `Invalid JSON Line: ${line} Column: ${column}` })
      } else {
        setError({ message: e.message })
      }
    }
  }

  const handleJsonChange = useCallback((jsonString) => {
    if (skipUpdateRef.current) {
      return
    }
    
    setCurrentJson(jsonString)
    parseJsonContent(jsonString)
    
    // Update the content and time of the selected history item
    if (selectedHistoryId) {
      setHistory(prev => prev.map(item =>
        item.id === selectedHistoryId
          ? { ...item, content: jsonString, size: new Blob([jsonString]).size, createdAt: Date.now() }
          : item
      ))
    }
    
    // Update diff if comparing
    if (compareWithId) {
      const compareItem = history.find(item => item.id === compareWithId)
      if (compareItem) {
        const result = computeLineDiff(jsonString, compareItem.content)
        setDiffResult(result)
      }
    }
  }, [selectedHistoryId, compareWithId, history])

  const getNextName = useCallback(() => {
    const names = history.map(item => item.name)
    let counter = history.length + 1
    let name = `JSON ${counter}`
    while (names.includes(name)) {
      counter++
      name = `JSON ${counter}`
    }
    return name
  }, [history])

  const addToHistory = useCallback((jsonString) => {
    const id = Date.now().toString()
    const newItem = {
      id,
      name: getNextName(),
      content: jsonString,
      createdAt: Date.now(),
      size: new Blob([jsonString]).size,
    }
    setHistory(prev => [newItem, ...prev])
    setSelectedHistoryId(id)
    return newItem
  }, [getNextName])

  const handleHistorySelect = useCallback((item) => {
    // Set flag to prevent handleJsonChange from being called
    skipUpdateRef.current = true
    
    setSelectedHistoryId(item.id)
    setCurrentJson(item.content)
    parseJsonContent(item.content)
    
    // Update diff if comparing
    if (compareWithId && compareWithId !== item.id) {
      const compareItem = history.find(h => h.id === compareWithId)
      if (compareItem) {
        const result = computeLineDiff(item.content, compareItem.content)
        setDiffResult(result)
      }
    } else if (compareWithId === item.id) {
      // Clicked on the item we're comparing with, clear comparison
      setCompareWithId(null)
      setDiffResult(null)
    }
    
    // Reset flag after a longer delay to ensure CodeMirror has finished updating
    setTimeout(() => {
      skipUpdateRef.current = false
    }, 500)
  }, [compareWithId, history])

  const handleNew = useCallback(() => {
    skipUpdateRef.current = true
    const newItem = addToHistory('')
    setSelectedHistoryId(newItem.id)
    setCurrentJson('')
    setParsedJson(null)
    setError(null)
    setCompareWithId(null)
    setDiffResult(null)
    setTimeout(() => {
      skipUpdateRef.current = false
    }, 500)
  }, [addToHistory])

  const handleOpen = useCallback(async () => {
    try {
      const result = await window.electronAPI.openFile()
      if (result) {
        skipUpdateRef.current = true
        const newItem = addToHistory(result.content)
        setSelectedHistoryId(newItem.id)
        setCurrentJson(result.content)
        parseJsonContent(result.content)
        setCompareWithId(null)
        setDiffResult(null)
        setTimeout(() => {
          skipUpdateRef.current = false
        }, 500)
      }
    } catch (err) {
      setError({ message: 'Failed to open file.' })
    }
  }, [addToHistory])

  const handleSaveJson = useCallback(async () => {
    if (!currentJson) {
      setError({ message: 'No JSON content.' })
      return
    }
    try {
      const formatted = JSON.stringify(parsedJson, null, 2)
      await window.electronAPI.saveFile(formatted, 'untitled.json', 'json')
    } catch (err) {
      setError({ message: 'Failed to save file.' })
    }
  }, [currentJson, parsedJson])

  const handleSaveTxt = useCallback(async () => {
    if (!currentJson) {
      setError({ message: 'No JSON content.' })
      return
    }
    try {
      await window.electronAPI.saveFile(currentJson, 'untitled.txt', 'txt')
    } catch (err) {
      setError({ message: 'Failed to save file.' })
    }
  }, [currentJson])

  const handleCopy = useCallback(async () => {
    if (!currentJson) return
    try {
      const formatted = JSON.stringify(parsedJson, null, 2)
      await navigator.clipboard.writeText(formatted)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 1500)
    } catch (err) {
      // Clipboard may be locked, use fallback
      try {
        const formatted = JSON.stringify(parsedJson, null, 2)
        const textarea = document.createElement('textarea')
        textarea.value = formatted
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 1500)
      } catch (e) {
        console.error('Copy failed:', e)
      }
    }
  }, [currentJson, parsedJson])

  const handleRename = useCallback((id, newName) => {
    setHistory(prev => prev.map(item =>
      item.id === id ? { ...item, name: newName } : item
    ))
  }, [])

  const handleDelete = useCallback((id) => {
    setHistory(prev => {
      const newHistory = prev.filter(item => item.id !== id)
      if (selectedHistoryId === id) {
        if (newHistory.length > 0) {
          setSelectedHistoryId(newHistory[0].id)
          setCurrentJson(newHistory[0].content)
          parseJsonContent(newHistory[0].content)
        } else {
          setSelectedHistoryId(null)
          setCurrentJson('')
          setParsedJson(null)
          setError(null)
        }
      }
      if (compareWithId === id) {
        setCompareWithId(null)
        setDiffResult(null)
      }
      return newHistory
    })
  }, [selectedHistoryId, compareWithId])

  const handleDuplicate = useCallback((id) => {
    const item = history.find(item => item.id === id)
    if (item) {
      skipUpdateRef.current = true
      const newItem = {
        ...item,
        id: Date.now().toString(),
        name: getNextName(),
        createdAt: Date.now(),
      }
      setHistory(prev => [newItem, ...prev])
      setSelectedHistoryId(newItem.id)
      setCurrentJson(newItem.content)
      parseJsonContent(newItem.content)
      setTimeout(() => {
        skipUpdateRef.current = false
      }, 500)
    }
  }, [history, getNextName])

  const handleDataChange = useCallback((newData) => {
    const formatted = JSON.stringify(newData, null, 2)
    skipUpdateRef.current = true
    setCurrentJson(formatted)
    setParsedJson(newData)
    setError(null)
    
    // Update history
    if (selectedHistoryId) {
      setHistory(prev => prev.map(item =>
        item.id === selectedHistoryId
          ? { ...item, content: formatted, size: new Blob([formatted]).size }
          : item
      ))
    }
    
    setTimeout(() => {
      skipUpdateRef.current = false
    }, 500)
  }, [selectedHistoryId])

  // Compare current JSON with another history item
  const handleCompareWith = useCallback((id) => {
    if (id === selectedHistoryId) {
      // Can't compare with self
      return
    }
    
    const compareItem = history.find(item => item.id === id)
    if (compareItem && currentJson) {
      setCompareWithId(id)
      const result = computeLineDiff(currentJson, compareItem.content)
      setDiffResult(result)
    }
  }, [selectedHistoryId, history, currentJson])

  // Clear comparison
  const handleClearCompare = useCallback(() => {
    setCompareWithId(null)
    setDiffResult(null)
  }, [])

  const handleLeftResize = useCallback((e) => {
    const startX = e.clientX
    const startWidth = leftWidth

    const onMouseMove = (e) => {
      const newWidth = startWidth + (e.clientX - startX)
      if (newWidth >= 150 && newWidth <= 500) {
        setLeftWidth(newWidth)
      }
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [leftWidth])

  const handleRightResize = useCallback((e) => {
    const startX = e.clientX
    const startWidth = rightWidth

    const onMouseMove = (e) => {
      const newWidth = startWidth - (e.clientX - startX)
      if (newWidth >= 200 && newWidth <= 600) {
        setRightWidth(newWidth)
      }
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [rightWidth])

  const handleCompare = useCallback(() => {
    setShowCompare(true)
  }, [])

  const handleCloseCompare = useCallback(() => {
    setShowCompare(false)
  }, [])

  return (
    <div className="app">
      <Toolbar
        onNew={handleNew}
        onOpen={handleOpen}
        onSaveJson={handleSaveJson}
        onSaveTxt={handleSaveTxt}
        onCopy={handleCopy}
        onCompare={handleCompare}
      />
      <div className="main-content">
        <div style={{ width: leftWidth, minWidth: leftWidth, maxWidth: leftWidth, flexShrink: 0 }}>
          <HistoryPanel
            history={history}
            selectedId={selectedHistoryId}
            onSelect={handleHistorySelect}
            onRename={handleRename}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onCompareWith={handleCompareWith}
            compareWithId={compareWithId}
          />
        </div>
        <div className="resize-handle" onMouseDown={handleLeftResize} />
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <JsonEditor
            value={currentJson}
            onChange={handleJsonChange}
            error={error}
            diffResult={diffResult}
            compareWithId={compareWithId}
            compareWithName={compareWithId ? history.find(h => h.id === compareWithId)?.name : null}
            onClearCompare={handleClearCompare}
          />
        </div>
        <div className="resize-handle" onMouseDown={handleRightResize} />
        <div style={{ width: rightWidth, minWidth: rightWidth, maxWidth: rightWidth, flexShrink: 0 }}>
          <JsonTree
            data={parsedJson}
            error={error}
            onDataChange={handleDataChange}
          />
        </div>
      </div>
      
      {showCompare && (
        <JsonCompare onClose={handleCloseCompare} />
      )}

      {copySuccess && (
        <div className="copy-toast">✓ Copied</div>
      )}
    </div>
  )
}

export default App
