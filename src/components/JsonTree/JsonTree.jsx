import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import TreeNode from './TreeNode'
import './JsonTree.css'

function JsonTree({ data, error, onDataChange }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandAll, setExpandAll] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const filteredData = useMemo(() => {
    if (!searchTerm || !data) return data
    return filterJson(data, searchTerm.toLowerCase())
  }, [data, searchTerm])

  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [])

  // Update value at path
  const updateValueAtPath = useCallback((obj, path, newValue) => {
    if (path.length === 0) return newValue
    
    const [head, ...rest] = path
    if (Array.isArray(obj)) {
      const index = parseInt(head)
      const result = [...obj]
      result[index] = updateValueAtPath(obj[index], rest, newValue)
      return result
    }
    
    return {
      ...obj,
      [head]: updateValueAtPath(obj[head], rest, newValue)
    }
  }, [])

  // Delete key at path
  const deleteKeyAtPath = useCallback((obj, path) => {
    if (path.length === 1) {
      if (Array.isArray(obj)) {
        const index = parseInt(path[0])
        return obj.filter((_, i) => i !== index)
      }
      const { [path[0]]: _, ...rest } = obj
      return rest
    }
    
    const [head, ...rest] = path
    if (Array.isArray(obj)) {
      const index = parseInt(head)
      const result = [...obj]
      result[index] = deleteKeyAtPath(obj[index], rest)
      return result
    }
    
    return {
      ...obj,
      [head]: deleteKeyAtPath(obj[head], rest)
    }
  }, [])

  // Rename key at path
  const renameKeyAtPath = useCallback((obj, path, newKey) => {
    if (path.length === 1) {
      if (Array.isArray(obj)) return obj
      const oldKey = path[0]
      const result = {}
      for (const [key, value] of Object.entries(obj)) {
        if (key === oldKey) {
          result[newKey] = value
        } else {
          result[key] = value
        }
      }
      return result
    }
    
    const [head, ...rest] = path
    if (Array.isArray(obj)) {
      const index = parseInt(head)
      const result = [...obj]
      result[index] = renameKeyAtPath(obj[index], rest, newKey)
      return result
    }
    
    return {
      ...obj,
      [head]: renameKeyAtPath(obj[head], rest, newKey)
    }
  }, [])

  const handleEdit = useCallback((path, value) => {
    if (onDataChange) {
      const newData = updateValueAtPath(data, path, value)
      onDataChange(newData)
    }
  }, [data, onDataChange, updateValueAtPath])

  const handleEditKey = useCallback((path, newKey) => {
    if (onDataChange) {
      const newData = renameKeyAtPath(data, path, newKey)
      onDataChange(newData)
    }
  }, [data, onDataChange, renameKeyAtPath])

  const handleDelete = useCallback((path) => {
    if (onDataChange) {
      const newData = deleteKeyAtPath(data, path)
      onDataChange(newData)
    }
  }, [data, onDataChange, deleteKeyAtPath])

  // Wrapper to convert path-based handlers to key-based for root level
  const wrapWithPath = useCallback((parentPath, handler) => {
    return (...args) => handler(parentPath, ...args)
  }, [])

  return (
    <div className="json-tree">
      <div className="tree-header">
        <h3>JSON Tree</h3>
        <div className="tree-controls">
          <input
            type="text"
            className="tree-search"
            placeholder="Search JSON..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            className="tree-btn"
            onClick={() => setExpandAll(!expandAll)}
          >
            {expandAll ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>
      <div className="tree-content">
        {error ? (
          <div className="tree-error">
            {error.message}
          </div>
        ) : data ? (
          <TreeNodeWithPath
            keyName="root"
            value={filteredData}
            depth={0}
            searchTerm={searchTerm}
            path={[]}
            onCopy={handleCopy}
            onEdit={handleEdit}
            onEditKey={handleEditKey}
            onDelete={handleDelete}
            expandAll={expandAll}
          />
        ) : (
          <div className="tree-empty">
            Paste JSON to see tree view
          </div>
        )}
      </div>

      {/* Copy success notification */}
      {copySuccess && (
        <div className="copy-notification">
          Copied!
        </div>
      )}
    </div>
  )
}

// Wrapper component to handle paths
function TreeNodeWithPath({ keyName, value, depth, searchTerm, path, onCopy, onEdit, onEditKey, onDelete, expandAll }) {
  const isObject = value !== null && typeof value === 'object'
  const isArray = Array.isArray(value)
  const entries = isObject ? Object.entries(value) : []

  const [isExpanded, setIsExpanded] = useState(depth < 2)
  const [contextMenu, setContextMenu] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')
  const menuRef = useRef(null)
  const inputRef = useRef(null)

  // Sync with expandAll prop
  useEffect(() => {
    if (isObject) {
      setIsExpanded(expandAll)
    }
  }, [expandAll, isObject])

  useEffect(() => {
    if (!contextMenu) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null)
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 10)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const toggleExpand = () => {
    if (isObject) setIsExpanded(!isExpanded)
  }

  const highlightText = (text) => {
    if (!searchTerm) return text
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? <span key={i} className="highlight">{part}</span> : part
    )
  }

  const renderValue = (val) => {
    if (val === null) return <span className="value-null">null</span>
    if (typeof val === 'boolean') return <span className="value-boolean">{val.toString()}</span>
    if (typeof val === 'number') return <span className="value-number">{val}</span>
    if (typeof val === 'string') return <span className="value-string">"{highlightText(val)}"</span>
    return val
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleEditValue = () => {
    setEditing('value')
    setEditValue(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))
    setContextMenu(null)
  }

  const handleEditKey = () => {
    setEditing('key')
    setEditValue(keyName)
    setContextMenu(null)
  }

  const handleDelete = () => {
    onDelete(path)
    setContextMenu(null)
  }

  const handleEditSave = () => {
    if (editing === 'value') {
      let parsedValue = editValue
      try {
        parsedValue = JSON.parse(editValue)
      } catch {
        // Keep as string
      }
      onEdit(path, parsedValue)
    } else if (editing === 'key') {
      if (editValue.trim() && editValue !== keyName) {
        onEditKey(path, editValue.trim())
      }
    }
    setEditing(null)
    setEditValue('')
  }

  const handleEditCancel = () => {
    setEditing(null)
    setEditValue('')
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') handleEditSave()
    else if (e.key === 'Escape') handleEditCancel()
  }

  return (
    <div className="tree-node" style={{ paddingLeft: `${depth * 16}px` }}>
      <div 
        className="tree-node-content" 
        onClick={toggleExpand}
        onContextMenu={handleContextMenu}
      >
        {isObject ? (
          <>
            <span className={`tree-arrow ${isExpanded ? 'expanded' : ''}`}>
              {isExpanded ? '▼' : '▶'}
            </span>
            {editing === 'key' ? (
              <input
                ref={inputRef}
                className="tree-inline-edit"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEditSave}
                onKeyDown={handleEditKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="tree-key" onDoubleClick={(e) => { e.stopPropagation(); handleEditKey() }}>
                {highlightText(keyName)}
              </span>
            )}
            <span className="tree-bracket">{isArray ? '[' : '{'}</span>
            {!isExpanded && (
              <span className="tree-preview">
                {isArray ? `${entries.length} items` : `${entries.length} keys`}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="tree-spacer" />
            {editing === 'key' ? (
              <input
                ref={inputRef}
                className="tree-inline-edit"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEditSave}
                onKeyDown={handleEditKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="tree-key" onDoubleClick={(e) => { e.stopPropagation(); handleEditKey() }}>
                {highlightText(keyName)}
              </span>
            )}
            <span className="tree-colon">:</span>
            {editing === 'value' ? (
              <input
                ref={inputRef}
                className="tree-inline-edit"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEditSave}
                onKeyDown={handleEditKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="tree-value" onDoubleClick={(e) => { e.stopPropagation(); handleEditValue() }}>
                {renderValue(value)}
              </span>
            )}
          </>
        )}
      </div>
      {isExpanded && isObject && (
        <div className="tree-children">
          {entries.map(([key, val], index) => (
            <TreeNodeWithPath
              key={key}
              keyName={key}
              value={val}
              depth={depth + 1}
              searchTerm={searchTerm}
              path={[...path, isArray ? String(index) : key]}
              onCopy={onCopy}
              onEdit={onEdit}
              onEditKey={onEditKey}
              onDelete={onDelete}
              expandAll={expandAll}
            />
          ))}
        </div>
      )}
      {contextMenu && (
        <div
          ref={menuRef}
          className="tree-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tree-context-menu-item" onClick={handleEditKey}>
            Edit Key
          </div>
          <div className="tree-context-menu-item" onClick={handleEditValue}>
            Edit Value
          </div>
          <div className="tree-context-menu-separator" />
          <div className="tree-context-menu-item" onClick={() => { onCopy(keyName); setContextMenu(null) }}>
            Copy Key
          </div>
          <div className="tree-context-menu-item" onClick={() => { 
            const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
            onCopy(valueStr)
            setContextMenu(null)
          }}>
            {isObject ? 'Copy Object' : 'Copy Value'}
          </div>
          <div className="tree-context-menu-separator" />
          <div className="tree-context-menu-item danger" onClick={handleDelete}>
            Delete
          </div>
        </div>
      )}
    </div>
  )
}

function filterJson(obj, searchTerm) {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => filterJson(item, searchTerm)).filter(item => item !== undefined)
  }

  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const keyMatch = key.toLowerCase().includes(searchTerm)
    const valueMatch = typeof value === 'string' && value.toLowerCase().includes(searchTerm)

    if (keyMatch || valueMatch) {
      result[key] = value
    } else if (typeof value === 'object' && value !== null) {
      const filtered = filterJson(value, searchTerm)
      if (Object.keys(filtered).length > 0) {
        result[key] = filtered
      }
    }
  }
  return result
}

export default JsonTree
