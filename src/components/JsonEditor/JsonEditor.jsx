import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection, crosshairCursor, highlightSpecialChars, Decoration } from '@codemirror/view'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, foldGutter, foldKeymap } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import './JsonEditor.css'

const setDiffDecorations = StateEffect.define()

const diffField = StateField.define({
  create() { return Decoration.none },
  update(decorations, tr) {
    for (const e of tr.effects) {
      if (e.is(setDiffDecorations)) return e.value
    }
    return tr.docChanged ? decorations.map(tr.changes) : decorations
  },
  provide: f => EditorView.decorations.from(f)
})

function createDiffDecoration(status) {
  return Decoration.line({ attributes: { class: `diff-line-${status}` } })
}

function JsonEditor({ value, onChange, error, diffResult, compareWithId, compareWithName, onClearCompare }) {
  const editorRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const skipUpdateRef = useRef(false)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  useEffect(() => {
    if (viewRef.current && diffResult) {
      const doc = viewRef.current.state.doc
      const decorations = []
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i)
        const status = diffResult.diffLines.get(i)
        if (status) decorations.push(createDiffDecoration(status).range(line.from))
      }
      decorations.sort((a, b) => a.from - b.from)
      viewRef.current.dispatch({ effects: setDiffDecorations.of(Decoration.set(decorations)) })
    } else if (viewRef.current && !diffResult) {
      viewRef.current.dispatch({ effects: setDiffDecorations.of(Decoration.none) })
    }
  }, [diffResult])

  useEffect(() => {
    if (editorRef.current && !viewRef.current) {
      const state = EditorState.create({
        doc: value || '',
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          drawSelection(),
          rectangularSelection(),
          crosshairCursor(),
          highlightSpecialChars(),
          history(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          highlightSelectionMatches(),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...completionKeymap,
            ...foldKeymap,
          ]),
          foldGutter({
            openText: '▼',
            closedText: '▶',
          }),
          json(),
          oneDark,
          syntaxHighlighting(defaultHighlightStyle),
          diffField,
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !skipUpdateRef.current) {
              onChangeRef.current(update.state.doc.toString())
            }
          }),
          EditorView.theme({
            '&': { height: '100%', fontSize: '14px' },
            '.cm-scroller': { overflow: 'auto' },
            '.cm-editor': { height: '100%' },
            '.cm-content': { minHeight: '100%' },
            // Gutters layout
            '.cm-gutters': {
              borderRight: '1px solid #3e3e42',
              backgroundColor: '#252526',
            },
            // Line numbers
            '.cm-lineNumbers .cm-gutterElement': {
              minWidth: '35px',
              padding: '0 4px 0 4px',
            },
            // Fold gutter - close to content
            '.cm-foldGutter .cm-gutterElement': {
              width: '18px',
              minWidth: '18px',
              padding: '0',
              cursor: 'pointer',
              fontSize: '10px',
              color: '#858585',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.12s ease',
            },
            '.cm-foldGutter .cm-gutterElement:hover': {
              color: '#cccccc',
            },
            '.cm-foldPlaceholder': {
              backgroundColor: 'transparent',
              border: 'none',
              color: '#858585',
              padding: '0 4px',
              cursor: 'pointer',
            },
            // Diff lines
            '.diff-line-added': {
              backgroundColor: 'rgba(105, 219, 124, 0.15)',
              borderLeft: '3px solid #69db7c',
            },
            '.diff-line-removed': {
              backgroundColor: 'rgba(255, 107, 107, 0.15)',
              borderLeft: '3px solid #ff6b6b',
            },
            '.diff-line-modified': {
              backgroundColor: 'rgba(255, 200, 50, 0.15)',
              borderLeft: '3px solid #ffc832',
            },
          }),
        ],
      })

      viewRef.current = new EditorView({ state, parent: editorRef.current })
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString()
      if (value !== currentValue) {
        skipUpdateRef.current = true
        viewRef.current.dispatch({
          changes: { from: 0, to: viewRef.current.state.doc.length, insert: value || '' },
        })
        requestAnimationFrame(() => { skipUpdateRef.current = false })
      }
    }
  }, [value])

  return (
    <div className="json-editor">
      <div className="editor-header">
        <h3>JSON Editor</h3>
        <div className="editor-header-right">
          {compareWithId && compareWithName && (
            <div className="compare-badge">
              <span>Comparing with: {compareWithName}</span>
              <button className="compare-clear-btn" onClick={onClearCompare}>✕</button>
            </div>
          )}
        </div>
      </div>
      <div className="editor-content" ref={editorRef} />
    </div>
  )
}

export default JsonEditor
