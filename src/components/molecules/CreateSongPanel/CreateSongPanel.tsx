import { useState } from 'react'
import { Button, Field } from '../../../design-system/components'
import styles from './CreateSongPanel.module.css'

type CreateSongPanelProps = {
  phase: 'form' | 'importing'
  importTitle?: string
  onCancel: () => void
  onContinue: (title: string, composer: string) => void
}

export function CreateSongPanel({ phase, importTitle, onCancel, onContinue }: CreateSongPanelProps) {
  const [title, setTitle] = useState('')
  const [composer, setComposer] = useState('')

  if (phase === 'importing') {
    return (
      <div className={styles.importing}>
        <div className={styles.importingHead}>
          <strong>Criando música</strong>
          <span>1 de 1</span>
        </div>
        <p className={styles.importingTitle}>{importTitle}</p>
        <div className={styles.bar}><span className={styles.barFill} /></div>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <Field label="Título" onChange={(event) => setTitle(event.target.value)} placeholder="Noite Feliz" value={title} />
      <Field label="Compositor" onChange={(event) => setComposer(event.target.value)} placeholder="Franz Gruber" value={composer} />
      <div className={styles.actions}>
        <Button onClick={onCancel} variant="quiet">Cancelar</Button>
        <Button disabled={!title.trim()} onClick={() => onContinue(title.trim(), composer.trim())} variant="primary">Continuar</Button>
      </div>
    </div>
  )
}
