import { useState, memo, useCallback, useEffect, useRef } from 'react'

const TreeNode = memo(function TreeNode({ keyName, value, depth = 0, searchTerm = '', onCopy, onEdit, onEditKey, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2)
  const [contextMenu, setContextMenu] = useState(null)
  const [editing, setEditing] = useState(null) // 'key' or 'value'
  const [editValue, setEditValue] = useState('')
  const menuRef = useRef(null)
  const inputRef = useRef(null)

  const isObject = value !== null && typeof value === 'object'
  const isArray = Array.isArray(value)
  const entries = isObject ? Object.entries(value) : []

  // Close context menu on click outside
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

  // Focus input when editing
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const toggleExpand = () => {
    if (isObject) {
      setIsExpanded(!isExpanded)
    }
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

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    })
  }, [])

  const handleCopyKey = useCallback(() => {
    if (onCopy) onCopy(keyName)
    setContextMenu(null)
  }, [keyName, onCopy])

  const handleCopyValue = useCallback(() => {
    if (onCopy) {
      const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
      onCopy(valueStr)
    }
    setContextMenu(null)
  }, [value, onCopy])

  const handleCopyKeyValue = useCallback(() => {
    if (onCopy) {
      const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
      onCopy(`${keyName}: ${valueStr}`)
    }
    setContextMenu(null)
  }, [keyName, value, onCopy])

  const handleEditValue = useCallback(() => {
    setEditing('value')
    setEditValue(typeof value === 'object' ? JSON.stringify(value) : String(value))
    setContextMenu(null)
  }, [value])

  const handleEditKey = useCallback(() => {
    setEditing('key')
    setEditValue(keyName)
    setContextMenu(null)
  }, [keyName])

  const handleDelete = useCallback(() => {
    if (onDelete) onDelete(keyName)
    setContextMenu(null)
  }, [keyName, onDelete])

  const handleEditSave = useCallback(() => {
    if (editing === 'value') {
      let parsedValue = editValue
      // Try to parse as JSON
      try {
        parsedValue = JSON.parse(editValue)
      } catch {
        // Keep as string
      }
      if (onEdit) onEdit(keyName, parsedValue)
    } else if (editing === 'key') {
      if (editValue.trim() && editValue !== keyName && onEditKey) {
        onEditKey(keyName, editValue.trim())
      }
    }
    setEditing(null)
    setEditValue('')
  }, [editing, editValue, keyName, onEdit, onEditKey])

  const handleEditCancel = useCallback(() => {
    setEditing(null)
    setEditValue('')
  }, [])

  const handleEditKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleEditSave()
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }, [handleEditSave, handleEditCancel])

  const handleDoubleClickKey = useCallback((e) => {
    e.stopPropagation()
    handleEditKey()
  }, [handleEditKey])

  const handleDoubleClickValue = useCallback((e) => {
    e.stopPropagation()
    handleEditValue()
  }, [handleEditValue])

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
              <span className="tree-key" onDoubleClick={handleDoubleClickKey}>{highlightText(keyName)}</span>
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
              <span className="tree-key" onDoubleClick={handleDoubleClickKey}>{highlightText(keyName)}</span>
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
              <span className="tree-value" onDoubleClick={handleDoubleClickValue}>{renderValue(value)}</span>
            )}
          </>
        )}
      </div>
      {isExpanded && isObject && (
        <div className="tree-children">
          {entries.map(([key, val]) => (
            <TreeNode
              key={key}
              keyName={key}
              value={val}
              depth={depth + 1}
              searchTerm={searchTerm}
              onCopy={onCopy}
              onEdit={onEdit}
              onEditKey={onEditKey}
              onDelete={onDelete}
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
          <div className="tree-context-menu-item" onClick={handleCopyKey}>
            Copy Key
          </div>
          <div className="tree-context-menu-item" onClick={handleCopyValue}>
            {isObject ? 'Copy Object' : 'Copy Value'}
          </div>
          <div className="tree-context-menu-item" onClick={handleCopyKeyValue}>
            Copy Key: Value
          </div>
          <div className="tree-context-menu-separator" />
          <div className="tree-context-menu-item danger" onClick={handleDelete}>
            Delete
          </div>
        </div>
      )}
    </div>
  )
})

export default TreeNode
