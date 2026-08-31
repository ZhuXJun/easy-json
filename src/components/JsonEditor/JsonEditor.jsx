import { useEffect, useRef, useCallback } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection, crosshairCursor, highlightSpecialChars, Decoration } from '@codemirror/view'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, indentOnInput } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import './JsonEditor.css'

// State effect to update diff decorations
const setDiffDecorations = StateEffect.define()

// State field to hold diff decorations
const diffField = StateField.define({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    for (const e of tr.effects) {
      if (e.is(setDiffDecorations)) {
        return e.value
      }
    }
    return tr.docChanged ? decorations.map(tr.changes) : decorations
  },
  provide: f => EditorView.decorations.from(f)
})

// Create decoration for a diff line
function createDiffDecoration(lineNum, status) {
  const lineDec = Decoration.line({
    attributes: { class: `diff-line-${status}` }
  })
  return lineDec
}

function JsonEditor({ value, onChange, error, diffResult, compareWithId, compareWithName, onClearCompare }) {
  const editorRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const skipUpdateRef = useRef(false)

  // Keep onChangeRef current
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Update diff decorations when diffResult changes
  useEffect(() => {
    if (viewRef.current && diffResult) {
      const doc = viewRef.current.state.doc
      const decorations = []
      
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i)
        const status = diffResult.diffLines.get(i)
        if (status) {
          decorations.push(createDiffDecoration(i, status).range(line.from))
        }
      }
      
      // Sort decorations by position (required by CodeMirror)
      decorations.sort((a, b) => a.from - b.from)
      
      const decorationSet = Decoration.set(decorations)
      viewRef.current.dispatch({
        effects: setDiffDecorations.of(decorationSet)
      })
    } else if (viewRef.current && !diffResult) {
      // Clear decorations
      viewRef.current.dispatch({
        effects: setDiffDecorations.of(Decoration.none)
      })
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
          foldGutter(),
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
          ]),
          json(),
          oneDark,
          syntaxHighlighting(defaultHighlightStyle),
          diffField,
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !skipUpdateRef.current) {
              const newValue = update.state.doc.toString()
              onChangeRef.current(newValue)
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
            '.cm-editor': {
              height: '100%',
            },
            '.cm-content': {
              minHeight: '100%',
            },
            // Diff line styles
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
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString()
      if (value !== currentValue) {
        skipUpdateRef.current = true
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: viewRef.current.state.doc.length,
            insert: value || '',
          },
        })
        // Reset skip flag after dispatch
        requestAnimationFrame(() => {
          skipUpdateRef.current = false
        })
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
