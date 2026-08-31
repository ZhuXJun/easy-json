# Desktop JSON Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows desktop JSON tool with Electron + React + Vite that supports JSON editing, formatting, tree view, and file operations.

**Architecture:** Single-page React application embedded in Electron shell. Three-panel layout with History (left), JSON Editor using CodeMirror (center), and JSON Tree view (right). File operations handled via Electron IPC with contextIsolation for security.

**Tech Stack:** Electron, React, Vite, CodeMirror, CSS (dark theme)

## Global Constraints

- All JSON processing uses native `JSON.parse()` and `JSON.stringify()` only
- No external JSON parsing libraries
- No backend services - all data processed locally
- JSON content must not be uploaded to any server
- `contextIsolation: true` required for Electron security
- Dark theme with modern minimalist developer tool aesthetic
- Must handle large JSON files (1-10MB) without UI freezing
- Tree nodes must render on-demand (lazy rendering)
- All file operations via IPC (React → Preload → Main Process → FileSystem)

---

### Task 1: Project Setup and Configuration

**Covers:** [S2, S17]

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.jsx`

**Interfaces:**
- Produces: Working Vite + React development environment

- [ ] **Step 1: Initialize npm project**

```bash
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react react-dom
npm install -D vite @vitejs/plugin-react electron electron-builder
npm install @codemirror/view @codemirror/state @codemirror/lang-json @codemirror/theme-one-dark
```

- [ ] **Step 3: Create package.json with scripts**

```json
{
  "name": "json-tool",
  "version": "1.0.0",
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron:dev": "concurrently \"vite\" \"electron .\"",
    "electron:build": "vite build && electron-builder",
    "preview": "vite preview"
  },
  "build": {
    "appId": "com.jsontool.app",
    "productName": "JSONTool",
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "directories": {
      "output": "release"
    }
  }
}
```

- [ ] **Step 4: Create vite.config.js**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
  },
})
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JSON Tool</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create src/main.jsx**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 7: Test development server**

```bash
npm run dev
```

Expected: Vite dev server starts on http://localhost:5173

---

### Task 2: Electron Main Process and Preload

**Covers:** [S13]

**Files:**
- Create: `electron/main.js`
- Create: `electron/preload.js`

**Interfaces:**
- Produces: `window.electronAPI` with methods: `openFile()`, `saveFile(content, defaultName, fileType)`, `showMessage(options)`

- [ ] **Step 1: Create electron/main.js**

```javascript
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../build/icon.ico'),
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// IPC Handlers
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    const content = fs.readFileSync(filePath, 'utf-8')
    return { filePath, content }
  }
  return null
})

ipcMain.handle('dialog:saveFile', async (event, content, defaultName, fileType) => {
  const filters = fileType === 'json'
    ? [{ name: 'JSON Files', extensions: ['json'] }]
    : [{ name: 'Text Files', extensions: ['txt'] }]

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters,
  })

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return { success: true, filePath: result.filePath }
  }
  return { success: false }
})
```

- [ ] **Step 2: Create electron/preload.js**

```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content, defaultName, fileType) =>
    ipcRenderer.invoke('dialog:saveFile', content, defaultName, fileType),
})
```

- [ ] **Step 3: Update package.json for Electron dev**

Add to scripts:
```json
"electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\""
```

Install concurrently and wait-on:
```bash
npm install -D concurrently wait-on
```

- [ ] **Step 4: Test Electron window**

```bash
npm run electron:dev
```

Expected: Electron window opens with React app loaded

---

### Task 3: App Layout and State Management

**Covers:** [S3, S6]

**Files:**
- Create: `src/App.jsx`
- Create: `src/App.css`

**Interfaces:**
- Produces: App component with state: `history`, `currentJson`, `parsedJson`, `error`

- [ ] **Step 1: Create src/App.jsx with layout structure**

```jsx
import { useState, useCallback } from 'react'
import Toolbar from './components/Toolbar/Toolbar'
import HistoryPanel from './components/HistoryPanel/HistoryPanel'
import JsonEditor from './components/JsonEditor/JsonEditor'
import JsonTree from './components/JsonTree/JsonTree'

function App() {
  const [history, setHistory] = useState([])
  const [currentJson, setCurrentJson] = useState('')
  const [parsedJson, setParsedJson] = useState(null)
  const [error, setError] = useState(null)
  const [selectedHistoryId, setSelectedHistoryId] = useState(null)

  const handleJsonChange = useCallback((jsonString) => {
    setCurrentJson(jsonString)
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
  }, [])

  const addToHistory = useCallback((jsonString) => {
    const id = Date.now().toString()
    const newItem = {
      id,
      name: `JSON ${history.length + 1}`,
      content: jsonString,
      createdAt: Date.now(),
      size: new Blob([jsonString]).size,
    }
    setHistory(prev => [newItem, ...prev])
    setSelectedHistoryId(id)
  }, [history.length])

  const handleHistorySelect = useCallback((item) => {
    setSelectedHistoryId(item.id)
    setCurrentJson(item.content)
    handleJsonChange(item.content)
  }, [handleJsonChange])

  const handleNew = useCallback(() => {
    if (currentJson && window.confirm('Current JSON has unsaved changes. Are you sure you want to create a new document?')) {
      setCurrentJson('')
      setParsedJson(null)
      setError(null)
      setSelectedHistoryId(null)
    } else if (!currentJson) {
      setCurrentJson('')
      setParsedJson(null)
      setError(null)
      setSelectedHistoryId(null)
    }
  }, [currentJson])

  const handleOpen = useCallback(async () => {
    try {
      const result = await window.electronAPI.openFile()
      if (result) {
        setCurrentJson(result.content)
        handleJsonChange(result.content)
        addToHistory(result.content)
      }
    } catch (err) {
      setError({ message: 'Failed to open file.' })
    }
  }, [handleJsonChange, addToHistory])

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
    if (!currentJson) {
      setError({ message: 'No JSON content.' })
      return
    }
    try {
      const formatted = JSON.stringify(parsedJson, null, 2)
      await navigator.clipboard.writeText(formatted)
      alert('Copied!')
    } catch (err) {
      setError({ message: 'Failed to copy.' })
    }
  }, [currentJson, parsedJson])

  return (
    <div className="app">
      <Toolbar
        onNew={handleNew}
        onOpen={handleOpen}
        onSaveJson={handleSaveJson}
        onSaveTxt={handleSaveTxt}
        onCopy={handleCopy}
      />
      <div className="main-content">
        <HistoryPanel
          history={history}
          selectedId={selectedHistoryId}
          onSelect={handleHistorySelect}
        />
        <JsonEditor
          value={currentJson}
          onChange={handleJsonChange}
          error={error}
        />
        <JsonTree
          data={parsedJson}
          error={error}
        />
      </div>
    </div>
  )
}

export default App
```

- [ ] **Step 2: Create src/App.css with dark theme base**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d30;
  --text-primary: #cccccc;
  --text-secondary: #858585;
  --border-color: #3e3e42;
  --accent-color: #007acc;
  --error-color: #f44747;
  --success-color: #4ec9b0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
```

- [ ] **Step 3: Test basic layout**

Run dev server and verify three-panel layout structure is visible.

---

### Task 4: Toolbar Component

**Covers:** [S4]

**Files:**
- Create: `src/components/Toolbar/Toolbar.jsx`
- Create: `src/components/Toolbar/Toolbar.css`

**Interfaces:**
- Consumes: `onNew`, `onOpen`, `onSaveJson`, `onSaveTxt`, `onCopy` callbacks
- Produces: Toolbar buttons that trigger parent callbacks

- [ ] **Step 1: Create Toolbar.jsx**

```jsx
import './Toolbar.css'

function Toolbar({ onNew, onOpen, onSaveJson, onSaveTxt, onCopy }) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-btn" onClick={onNew} title="New">
          <span className="btn-icon">📄</span>
          <span className="btn-text">New</span>
        </button>
        <button className="toolbar-btn" onClick={onOpen} title="Open JSON file">
          <span className="btn-icon">📂</span>
          <span className="btn-text">Open</span>
        </button>
        <div className="toolbar-separator" />
        <button className="toolbar-btn" onClick={onSaveJson} title="Save as JSON">
          <span className="btn-icon">💾</span>
          <span className="btn-text">Save JSON</span>
        </button>
        <button className="toolbar-btn" onClick={onSaveTxt} title="Save as TXT">
          <span className="btn-icon">📝</span>
          <span className="btn-text">Save TXT</span>
        </button>
        <div className="toolbar-separator" />
        <button className="toolbar-btn" onClick={onCopy} title="Copy to clipboard">
          <span className="btn-icon">📋</span>
          <span className="btn-text">Copy</span>
        </button>
      </div>
      <div className="toolbar-right">
        <span className="app-title">JSON Tool</span>
      </div>
    </div>
  )
}

export default Toolbar
```

- [ ] **Step 2: Create Toolbar.css**

```css
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  min-height: 48px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.toolbar-btn:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--border-color);
}

.toolbar-btn:active {
  background-color: var(--accent-color);
}

.btn-icon {
  font-size: 14px;
}

.btn-text {
  font-weight: 500;
}

.toolbar-separator {
  width: 1px;
  height: 24px;
  background-color: var(--border-color);
  margin: 0 4px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}
```

- [ ] **Step 3: Integrate Toolbar in App and test**

Verify all buttons render and are clickable.

---

### Task 5: History Panel Component

**Covers:** [S5]

**Files:**
- Create: `src/components/HistoryPanel/HistoryPanel.jsx`
- Create: `src/components/HistoryPanel/HistoryPanel.css`

**Interfaces:**
- Consumes: `history` array, `selectedId`, `onSelect` callback
- Produces: History list with clickable items

- [ ] **Step 1: Create HistoryPanel.jsx**

```jsx
import './HistoryPanel.css'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function HistoryPanel({ history, selectedId, onSelect }) {
  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>History</h3>
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
            >
              <div className="history-item-name">{item.name}</div>
              <div className="history-item-meta">
                <span className="history-item-time">{formatTime(item.createdAt)}</span>
                <span className="history-item-size">{formatSize(item.size)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default HistoryPanel
```

- [ ] **Step 2: Create HistoryPanel.css**

```css
.history-panel {
  width: 240px;
  min-width: 200px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.history-header h3 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.history-empty {
  padding: 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.history-item {
  padding: 10px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 4px;
}

.history-item:hover {
  background-color: var(--bg-tertiary);
}

.history-item.selected {
  background-color: var(--accent-color);
}

.history-item-name {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}

.history-item-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
}

.history-item.selected .history-item-meta {
  color: rgba(255, 255, 255, 0.7);
}
```

- [ ] **Step 3: Integrate HistoryPanel and test**

Add sample history items and verify selection works.

---

### Task 6: JSON Editor Component with CodeMirror

**Covers:** [S6, S7, S12]

**Files:**
- Create: `src/components/JsonEditor/JsonEditor.jsx`
- Create: `src/components/JsonEditor/JsonEditor.css`

**Interfaces:**
- Consumes: `value`, `onChange`, `error` props
- Produces: CodeMirror editor with JSON syntax highlighting

- [ ] **Step 1: Create JsonEditor.jsx**

```jsx
import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorState } from '@codemirror/state'
import './JsonEditor.css'

function JsonEditor({ value, onChange, error }) {
  const editorRef = useRef(null)
  const viewRef = useRef(null)

  useEffect(() => {
    if (editorRef.current && !viewRef.current) {
      const state = EditorState.create({
        doc: value || '',
        extensions: [
          basicSetup,
          json(),
          oneDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newValue = update.state.doc.toString()
              onChange(newValue)
            }
          }),
          EditorView.theme({
            '&': {
              height: '100%',
              fontSize: '14px',
            },
            '.cm-scroller': {
              overflow: 'auto',
            },
          }),
        ],
      })

      viewRef.current = new EditorView({
        state,
        parent: editorRef.current,
      })
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value || '',
        },
      })
    }
  }, [value])

  return (
    <div className="json-editor">
      <div className="editor-header">
        <h3>JSON Editor</h3>
        {error && (
          <div className="editor-error">
            {error.message}
          </div>
        )}
      </div>
      <div className="editor-content" ref={editorRef} />
    </div>
  )
}

export default JsonEditor
```

- [ ] **Step 2: Create JsonEditor.css**

```css
.json-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-primary);
}

.editor-header {
  padding: 8px 16px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-header h3 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.editor-error {
  padding: 4px 8px;
  background-color: var(--error-color);
  color: white;
  border-radius: 4px;
  font-size: 12px;
}

.editor-content {
  flex: 1;
  overflow: hidden;
}

.editor-content .cm-editor {
  height: 100%;
}
```

- [ ] **Step 3: Test editor functionality**

Paste JSON and verify syntax highlighting, line numbers, and error display work.

---

### Task 7: JSON Tree Component

**Covers:** [S8, S9, S10, S11]

**Files:**
- Create: `src/components/JsonTree/JsonTree.jsx`
- Create: `src/components/JsonTree/JsonTree.css`
- Create: `src/components/JsonTree/TreeNode.jsx`

**Interfaces:**
- Consumes: `data` (parsed JSON), `error` props
- Produces: Tree view with expand/collapse and search

- [ ] **Step 1: Create TreeNode.jsx for recursive rendering**

```jsx
import { useState, memo } from 'react'

const TreeNode = memo(function TreeNode({ keyName, value, depth = 0, searchTerm = '' }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2)

  const isObject = value !== null && typeof value === 'object'
  const isArray = Array.isArray(value)
  const entries = isObject ? Object.entries(value) : []

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

  return (
    <div className="tree-node" style={{ paddingLeft: `${depth * 16}px` }}>
      <div className="tree-node-content" onClick={toggleExpand}>
        {isObject ? (
          <>
            <span className={`tree-arrow ${isExpanded ? 'expanded' : ''}`}>
              {isExpanded ? '▼' : '▶'}
            </span>
            <span className="tree-key">{highlightText(keyName)}</span>
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
            <span className="tree-key">{highlightText(keyName)}</span>
            <span className="tree-colon">:</span>
            <span className="tree-value">{renderValue(value)}</span>
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
            />
          ))}
        </div>
      )}
    </div>
  )
})

export default TreeNode
```

- [ ] **Step 2: Create JsonTree.jsx**

```jsx
import { useState, useMemo } from 'react'
import TreeNode from './TreeNode'
import './JsonTree.css'

function JsonTree({ data, error }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandAll, setExpandAll] = useState(false)

  const filteredData = useMemo(() => {
    if (!searchTerm || !data) return data
    return filterJson(data, searchTerm.toLowerCase())
  }, [data, searchTerm])

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
          <TreeNode
            keyName="root"
            value={filteredData}
            depth={0}
            searchTerm={searchTerm}
          />
        ) : (
          <div className="tree-empty">
            Paste JSON to see tree view
          </div>
        )}
      </div>
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
```

- [ ] **Step 3: Create JsonTree.css**

```css
.json-tree {
  width: 350px;
  min-width: 280px;
  background-color: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tree-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.tree-header h3 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.tree-controls {
  display: flex;
  gap: 8px;
}

.tree-search {
  flex: 1;
  padding: 6px 10px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}

.tree-search:focus {
  border-color: var(--accent-color);
}

.tree-btn {
  padding: 6px 10px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;
}

.tree-btn:hover {
  background-color: var(--accent-color);
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.tree-error {
  padding: 12px;
  background-color: var(--error-color);
  color: white;
  border-radius: 4px;
  font-size: 13px;
}

.tree-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.tree-node {
  margin-bottom: 2px;
}

.tree-node-content {
  display: flex;
  align-items: center;
  padding: 3px 0;
  cursor: pointer;
  border-radius: 3px;
}

.tree-node-content:hover {
  background-color: var(--bg-tertiary);
}

.tree-arrow {
  width: 16px;
  font-size: 10px;
  color: var(--text-secondary);
  transition: transform 0.15s ease;
}

.tree-arrow.expanded {
  transform: rotate(0deg);
}

.tree-spacer {
  width: 16px;
}

.tree-key {
  color: var(--accent-color);
  margin-right: 4px;
}

.tree-colon {
  color: var(--text-secondary);
  margin-right: 4px;
}

.tree-value {
  color: var(--text-primary);
}

.value-string {
  color: var(--success-color);
}

.value-number {
  color: #b5cea8;
}

.value-boolean {
  color: #569cd6;
}

.value-null {
  color: var(--text-secondary);
  font-style: italic;
}

.tree-bracket {
  color: var(--text-secondary);
  margin-left: 4px;
}

.tree-preview {
  color: var(--text-secondary);
  font-size: 12px;
  margin-left: 8px;
}

.tree-children {
  border-left: 1px solid var(--border-color);
  margin-left: 8px;
}

.highlight {
  background-color: var(--accent-color);
  color: white;
  padding: 1px 2px;
  border-radius: 2px;
}
```

- [ ] **Step 4: Test tree functionality**

Paste nested JSON and verify expand/collapse and search work correctly.

---

### Task 8: JSON Utility Functions

**Covers:** [S12]

**Files:**
- Create: `src/utils/json.js`

**Interfaces:**
- Produces: `formatJson(jsonString)`, `parseJson(jsonString)`, `generateTree(data)` functions

- [ ] **Step 1: Create src/utils/json.js**

```javascript
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
```

- [ ] **Step 2: Test utility functions**

Create simple test to verify JSON parsing and formatting work correctly.

---

### Task 9: Integration and Testing

**Covers:** [S14, S15, S16]

**Files:**
- Modify: `src/App.jsx` (integrate all components)

**Interfaces:**
- All components integrated into working application

- [ ] **Step 1: Update App.jsx with all imports**

Verify all components are properly imported and connected.

- [ ] **Step 2: Test complete workflow**

1. Paste JSON in editor
2. Verify auto-formatting
3. Check tree view updates
4. Test history panel
5. Test toolbar buttons (New, Open, Save, Copy)
6. Test search functionality
7. Test with large JSON file (1MB+)

- [ ] **Step 3: Test error handling**

1. Paste invalid JSON
2. Verify error message displays
3. Verify tree doesn't crash
4. Test file operations error handling

- [ ] **Step 4: Performance testing**

1. Load 5MB JSON file
2. Verify UI remains responsive
3. Test tree expand/collapse performance
4. Test search performance

---

### Task 10: Build and Package

**Covers:** [S17]

**Files:**
- Modify: `package.json` (add build scripts)
- Create: `build/icon.ico` (app icon)

**Interfaces:**
- Produces: Windows EXE installer

- [ ] **Step 1: Create app icon**

Create or obtain a 256x256 ICO file for the app icon.

- [ ] **Step 2: Update package.json build configuration**

```json
{
  "build": {
    "appId": "com.jsontool.app",
    "productName": "JSONTool",
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    },
    "directories": {
      "output": "release"
    }
  }
}
```

- [ ] **Step 3: Build the application**

```bash
npm run electron:build
```

Expected: Creates `release/JSONTool-Setup.exe`

- [ ] **Step 4: Test the built application**

1. Run the installer
2. Verify all features work
3. Test file operations
4. Verify no Node.js/Python dependency

---

## Final Verification Checklist

- [ ] All JSON processing uses native JSON.parse/stringify
- [ ] No external JSON parsing libraries
- [ ] All file operations via IPC with contextIsolation
- [ ] Dark theme applied consistently
- [ ] Three-panel layout with resizable panels
- [ ] History panel shows past documents
- [ ] JSON Editor with syntax highlighting and line numbers
- [ ] JSON Tree with expand/collapse and search
- [ ] Error handling for invalid JSON
- [ ] Performance acceptable for 1-10MB files
- [ ] Windows EXE builds and runs correctly
- [ ] No backend services or external API calls
