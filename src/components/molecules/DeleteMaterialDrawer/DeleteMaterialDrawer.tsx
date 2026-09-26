import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Material } from '../../../types'
import { Button } from '../../../design-system/components'
import { isVideoMaterial, sectionOf } from '../../../lib/materials'
import styles from './DeleteMaterialDrawer.module.css'

type DeleteMaterialDrawerProps = {
  material: Material
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteMaterialDrawer({ material, onCancel, onConfirm }: DeleteMaterialDrawerProps) {
  const isMedia = sectionOf(material) === 'media'
  const kind = isVideoMaterial(material) ? 'vídeo' : isMedia ? 'mídia' : 'material'

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    document.getElementById('cancel-delete-material')?.focus()

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [onCancel])

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
    >
      <section aria-describedby="delete-material-description" aria-labelledby="delete-material-title" aria-modal="true" className={styles.drawer} role="alertdialog">
        <div className={styles.content}>
          <div className={styles.copy}>
            <h2 id="delete-material-title">Deseja realmente excluir este {kind}?</h2>
            <p id="delete-material-description"><strong>{material.name}</strong> será removido desta música. Esta ação não poderá ser desfeita.</p>
          </div>
          <div className={styles.actions}>
            <Button className={styles.action} id="cancel-delete-material" onClick={onCancel} variant="quiet">Cancelar</Button>
            <Button className={styles.action} onClick={onConfirm} variant="danger">Excluir</Button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  )
}
