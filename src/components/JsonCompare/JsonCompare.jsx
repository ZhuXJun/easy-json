import { useState, useCallback, useRef, useEffect } from 'react'
import './JsonCompare.css'

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

function computeDiffWithRootPath(text1, text2) {
  try {
    const obj1 = JSON.parse(text1)
    const obj2 = JSON.parse(text2)
    const sorted1 = JSON.stringify(sortJsonKeys(obj1), null, 2)
    const sorted2 = JSON.stringify(sortJsonKeys(obj2), null, 2)
    const lines1 = sorted1.split('\n')
    const lines2 = sorted2.split('\n')
    const maxLen = Math.max(lines1.length, lines2.length)
    const result1 = []
    const result2 = []
    let diffCount = 0
    for (let i = 0; i < maxLen; i++) {
      const l1 = i < lines1.length ? lines1[i] : null
      const l2 = i < lines2.length ? lines2[i] : null
      if (l1 === l2) {
        result1.push({ text: l1, status: 'same' })
        result2.push({ text: l2, status: 'same' })
      } else {
        result1.push({ text: l1 || '', status: 'diff' })
        result2.push({ text: l2 || '', status: 'diff' })
        diffCount++
      }
    }
    return { left: result1, right: result2, diffCount }
  } catch (e) {
    return null
  }
}

function computeDiffValueOnly(text1, text2) {
  try {
    const obj1 = JSON.parse(text1)
    const obj2 = JSON.parse(text2)
    const sorted1 = JSON.stringify(sortJsonKeys(obj1), null, 2)
    const sorted2 = JSON.stringify(sortJsonKeys(obj2), null, 2)
    const lines1 = sorted1.split('\n')
    const lines2 = sorted2.split('\n')
    const parseLineValue = (line) => {
      const match = line.match(/:\s*(.+?)\s*,?\s*$/)
      if (match) return match[1].trim()
      return line.trim()
    }
    const maxLen = Math.max(lines1.length, lines2.length)
    const result1 = []
    const result2 = []
    let diffCount = 0
    for (let i = 0; i < maxLen; i++) {
      const l1 = i < lines1.length ? lines1[i] : null
      const l2 = i < lines2.length ? lines2[i] : null
      if (l1 === l2) {
        result1.push({ text: l1, status: 'same' })
        result2.push({ text: l2, status: 'same' })
      } else {
        const v1 = l1 ? parseLineValue(l1) : null
        const v2 = l2 ? parseLineValue(l2) : null
        if (v1 === v2 && v1 !== null) {
          result1.push({ text: l1, status: 'same' })
          result2.push({ text: l2, status: 'same' })
        } else {
          result1.push({ text: l1 || '', status: 'diff' })
          result2.push({ text: l2 || '', status: 'diff' })
          diffCount++
        }
      }
    }
    return { left: result1, right: result2, diffCount }
  } catch (e) {
    return null
  }
}

function JsonCompare({ onClose }) {
  const [json1, setJson1] = useState('')
  const [json2, setJson2] = useState('')
  const [error1, setError1] = useState(null)
  const [error2, setError2] = useState(null)
  const [diffResult, setDiffResult] = useState(null)
  const [isAutoCompare, setIsAutoCompare] = useState(true)
  const [rootPath, setRootPath] = useState(false)
  const [currentDiffIndex, setCurrentDiffIndex] = useState(-1)
  const [diffIndices, setDiffIndices] = useState([])
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const isScrollSync = useRef(false)

  const handleScrollLeft = useCallback(() => {
    if (isScrollSync.current) return
    isScrollSync.current = true
    if (rightRef.current && leftRef.current) {
      rightRef.current.scrollTop = leftRef.current.scrollTop
    }
    requestAnimationFrame(() => { isScrollSync.current = false })
  }, [])

  const handleScrollRight = useCallback(() => {
    if (isScrollSync.current) return
    isScrollSync.current = true
    if (leftRef.current && rightRef.current) {
      leftRef.current.scrollTop = rightRef.current.scrollTop
    }
    requestAnimationFrame(() => { isScrollSync.current = false })
  }, [])

  const validateJson = (value, setError) => {
    try {
      if (value.trim()) {
        JSON.parse(value)
        setError(null)
      } else {
        setError(null)
      }
    } catch (err) {
      const match = err.message.match(/position (\d+)/)
      if (match) {
        const pos = parseInt(match[1])
        const lines = value.substring(0, pos).split('\n')
        setError(`Invalid JSON Line: ${lines.length} Column: ${lines[lines.length - 1].length + 1}`)
      } else {
        setError(err.message)
      }
    }
  }

  const handleJson1Change = useCallback((e) => {
    setJson1(e.target.value)
    validateJson(e.target.value, setError1)
  }, [])

  const handleJson2Change = useCallback((e) => {
    setJson2(e.target.value)
    validateJson(e.target.value, setError2)
  }, [])

  const handleCompare = useCallback(() => {
    if (!json1.trim() || !json2.trim()) {
      setDiffResult(null)
      return
    }
    if (json1.length > 500000 || json2.length > 500000) {
      setDiffResult({ left: [], right: [], diffCount: 0, error: 'File too large (>500KB). Click Compare manually.' })
      return
    }
    const result = rootPath ? computeDiffWithRootPath(json1, json2) : computeDiffValueOnly(json1, json2)
    setDiffResult(result)
    if (result) {
      const indices = []
      result.left.forEach((line, i) => {
        if (line.status === 'diff') indices.push(i)
      })
      setDiffIndices(indices)
      setCurrentDiffIndex(indices.length > 0 ? 0 : -1)
    }
  }, [json1, json2, rootPath])

  useEffect(() => {
    if (isAutoCompare && json1.trim() && json2.trim() && !error1 && !error2) {
      const isLarge = json1.length > 50000 || json2.length > 50000
      const delay = isLarge ? 1000 : 500
      const timer = setTimeout(handleCompare, delay)
      return () => clearTimeout(timer)
    }
  }, [json1, json2, error1, error2, isAutoCompare, handleCompare])

  const handleNextDiff = useCallback(() => {
    if (diffIndices.length === 0) return
    const nextIndex = (currentDiffIndex + 1) % diffIndices.length
    setCurrentDiffIndex(nextIndex)
    const lineIndex = diffIndices[nextIndex]
    const lineEl = leftRef.current?.querySelector(`.diff-line:nth-child(${lineIndex + 1})`)
    if (lineEl) {
      lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      lineEl.classList.add('diff-line-highlight')
      setTimeout(() => lineEl.classList.remove('diff-line-highlight'), 1000)
    }
  }, [currentDiffIndex, diffIndices])

  const handlePrevDiff = useCallback(() => {
    if (diffIndices.length === 0) return
    const prevIndex = (currentDiffIndex - 1 + diffIndices.length) % diffIndices.length
    setCurrentDiffIndex(prevIndex)
    const lineIndex = diffIndices[prevIndex]
    const lineEl = leftRef.current?.querySelector(`.diff-line:nth-child(${lineIndex + 1})`)
    if (lineEl) {
      lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      lineEl.classList.add('diff-line-highlight')
      setTimeout(() => lineEl.classList.remove('diff-line-highlight'), 1000)
    }
  }, [currentDiffIndex, diffIndices])

  const handlePaste = useCallback(async (setter) => {
    try {
      const text = await navigator.clipboard.readText()
      setter(text)
    } catch (err) {
      console.error('Failed to paste:', err)
    }
  }, [])

  const handleSwap = useCallback(() => {
    const temp = json1
    setJson1(json2)
    setJson2(temp)
    setError1(error2)
    setError2(error1)
    setDiffResult(null)
  }, [json1, json2, error1, error2])

  const handleClear = useCallback(() => {
    setJson1('')
    setJson2('')
    setError1(null)
    setError2(null)
    setDiffResult(null)
  }, [])

  const formatSize = (str) => {
    const bytes = new Blob([str]).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Input mode
  if (!diffResult) {
    return (
      <div className="json-compare-overlay">
        <div className="json-compare-modal">
          <div className="compare-header">
            <h2>JSON Compare</h2>
            <div className="compare-header-actions">
              <label className="compare-toggle">
                <input type="checkbox" checked={rootPath} onChange={(e) => setRootPath(e.target.checked)} />
                <span>rootPath</span>
              </label>
              <label className="compare-toggle">
                <input type="checkbox" checked={isAutoCompare} onChange={(e) => setIsAutoCompare(e.target.checked)} />
                <span>Auto</span>
              </label>
              <button className="compare-btn" onClick={handleSwap}>⇄ Swap</button>
              <button className="compare-btn" onClick={handleClear}>Clear</button>
              <button className="compare-btn close" onClick={onClose}>✕</button>
            </div>
          </div>
          <div className="compare-inputs">
            <div className="compare-input-panel">
              <div className="compare-input-header">
                <h3>JSON 1</h3>
                <div className="compare-input-actions">
                  <button className="compare-btn-small" onClick={() => handlePaste((t) => { setJson1(t); validateJson(t, setError1) })}>Paste</button>
                  {json1 && <span className="compare-size">{formatSize(json1)}</span>}
                </div>
              </div>
              {error1 && <div className="compare-error">{error1}</div>}
              <textarea className="compare-textarea" value={json1} onChange={handleJson1Change} placeholder="Paste JSON here..." spellCheck={false} />
            </div>
            <div className="compare-center">
              {!isAutoCompare && <button className="compare-btn compare-action" onClick={handleCompare}>Compare</button>}
            </div>
            <div className="compare-input-panel">
              <div className="compare-input-header">
                <h3>JSON 2</h3>
                <div className="compare-input-actions">
                  <button className="compare-btn-small" onClick={() => handlePaste((t) => { setJson2(t); validateJson(t, setError2) })}>Paste</button>
                  {json2 && <span className="compare-size">{formatSize(json2)}</span>}
                </div>
              </div>
              {error2 && <div className="compare-error">{error2}</div>}
              <textarea className="compare-textarea" value={json2} onChange={handleJson2Change} placeholder="Paste JSON here..." spellCheck={false} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error mode
  if (diffResult.error) {
    return (
      <div className="json-compare-overlay">
        <div className="json-compare-modal">
          <div className="compare-header">
            <h2>JSON Compare</h2>
            <div className="compare-header-actions">
              <button className="compare-btn" onClick={() => setDiffResult(null)}>← Edit</button>
              <button className="compare-btn close" onClick={onClose}>✕</button>
            </div>
          </div>
          <div className="diff-error-large">
            <span>⚠️ {diffResult.error}</span>
            <button className="compare-btn" onClick={handleCompare}>Try Compare Anyway</button>
          </div>
        </div>
      </div>
    )
  }

  // Diff mode - read only
  return (
    <div className="json-compare-overlay">
      <div className="json-compare-modal">
        <div className="compare-header">
          <h2>JSON Compare</h2>
          <div className="compare-header-actions">
            <button className="compare-btn" onClick={() => setDiffResult(null)}>← Edit</button>
            {diffIndices.length > 0 && (
              <div className="diff-nav">
                <button className="compare-btn nav" onClick={handlePrevDiff}>◀</button>
                <span className="diff-nav-info">{currentDiffIndex + 1}/{diffIndices.length}</span>
                <button className="compare-btn nav" onClick={handleNextDiff}>▶</button>
              </div>
            )}
            <div className="diff-stats">
              {diffResult.diffCount === 0
                ? <span className="stat stat-same">✓ Identical</span>
                : <span className="stat stat-diff">{diffResult.diffCount} diffs</span>
              }
            </div>
            <button className="compare-btn close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="diff-panels">
          <div className="diff-panel">
            <div className="diff-panel-header"><h4>JSON 1</h4></div>
            <div className="diff-content" ref={leftRef} onScroll={handleScrollLeft}>
              {diffResult.left.map((line, i) => (
                <div key={i} className={`diff-line ${line.status}`}>
                  <span className="diff-line-num">{i + 1}</span>
                  <span className="diff-line-text">{line.text || '\u00A0'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="diff-panel">
            <div className="diff-panel-header"><h4>JSON 2</h4></div>
            <div className="diff-content" ref={rightRef} onScroll={handleScrollRight}>
              {diffResult.right.map((line, i) => (
                <div key={i} className={`diff-line ${line.status}`}>
                  <span className="diff-line-num">{i + 1}</span>
                  <span className="diff-line-text">{line.text || '\u00A0'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JsonCompare
