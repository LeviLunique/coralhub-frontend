import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Pencil } from 'lucide-react'
import styles from './InlineEditField.module.css'

type InlineEditFieldProps = {
  label: string
  value?: string
  placeholder?: string
  canEdit: boolean
  onSave: (value: string) => void
  multiline?: boolean
}

export function InlineEditField({ label, value, placeholder = 'Adicionar', canEdit, onSave, multiline = false }: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function startEdit() {
    if (!canEdit) {
      return
    }
    setDraft(value ?? '')
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    const next = draft.trim()
    if (next !== (value ?? '')) {
      onSave(next)
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !multiline) {
      event.preventDefault()
      commit()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setEditing(false)
    }
  }

  return (
    <div className={`${styles.field} ${canEdit && !editing ? styles.editableField : ''}`}>
      <span className={styles.label}>{label}</span>
      {editing ? (
        multiline ? (
          <textarea className={styles.input} onBlur={commit} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} ref={inputRef} rows={2} value={draft} />
        ) : (
          <input className={styles.input} onBlur={commit} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} ref={inputRef} value={draft} />
        )
      ) : (
        <button className={`${styles.value} ${canEdit ? styles.editable : ''}`} disabled={!canEdit} onClick={startEdit} type="button">
          <span className={value ? styles.text : styles.placeholder}>{value || placeholder}</span>
          {canEdit ? <span aria-hidden="true" className={styles.pencil}><Pencil size={15} /></span> : null}
        </button>
      )}
    </div>
  )
}
