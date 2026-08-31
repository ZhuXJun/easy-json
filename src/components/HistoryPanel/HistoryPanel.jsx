import { useState, useRef, useEffect } from 'react'
import './HistoryPanel.css'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function HistoryPanel({ history, selectedId, onSelect, onRename, onDelete, onDuplicate, onCompareWith, compareWithId }) {
  const [contextMenu, setContextMenu] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const menuRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const handleContextMenu = (e, item) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, item })
  }

  const handleRename = (item) => {
    setEditingId(item.id)
    setEditName(item.name)
    setContextMenu(null)
  }

  const handleRenameSubmit = (id) => {
    if (editName.trim()) {
      onRename(id, editName.trim())
    }
    setEditingId(null)
    setEditName('')
  }

  const handleRenameKeyDown = (e, id) => {
    if (e.key === 'Enter') handleRenameSubmit(id)
    else if (e.key === 'Escape') {
      setEditingId(null)
      setEditName('')
    }
  }

  const handleDelete = (item) => {
    onDelete(item.id)
    setContextMenu(null)
  }

  const handleDuplicate = (item) => {
    onDuplicate(item.id)
    setContextMenu(null)
  }

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>History</h3>
        <span className="history-count">{history.length}</span>
      </div>
      <div className="history-list">
        {history.length === 0 ? (
          <div className="history-empty">No history yet</div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className={`history-item ${selectedId === item.id ? 'selected' : ''}`}
              onClick={() => onSelect(item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
            >
              {editingId === item.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  className="history-item-rename-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleRenameSubmit(item.id)}
                  onKeyDown={(e) => handleRenameKeyDown(e, item.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="history-item-name">{item.name}</div>
              )}
              <div className="history-item-meta">
                <span className="history-item-time">{formatTime(item.createdAt)}</span>
                <span className="history-item-size">{formatSize(item.size)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="context-menu-item" onClick={() => handleRename(contextMenu.item)}>
            Rename
          </div>
          {contextMenu.item.id !== selectedId && (
            <div className="context-menu-item" onClick={() => { onCompareWith(contextMenu.item.id); setContextMenu(null) }}>
              {compareWithId === contextMenu.item.id ? '✓ Comparing' : 'Compare With'}
            </div>
          )}
          <div className="context-menu-item" onClick={() => handleDuplicate(contextMenu.item)}>
            Duplicate
          </div>
          <div className="context-menu-separator" />
          <div className="context-menu-item danger" onClick={() => handleDelete(contextMenu.item)}>
            Delete
          </div>
        </div>
      )}
    </div>
  )
}

export default HistoryPanel
