import './Toolbar.css'

function Toolbar({ onNew, onOpen, onSaveJson, onSaveTxt, onCopy, onCompare }) {
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
        <div className="toolbar-separator" />
        <button className="toolbar-btn" onClick={onCompare} title="Compare JSON">
          <span className="btn-icon">🔄</span>
          <span className="btn-text">Compare</span>
        </button>
      </div>
      <div className="toolbar-right">
        <span className="app-title">EasyJSON</span>
      </div>
    </div>
  )
}

export default Toolbar
