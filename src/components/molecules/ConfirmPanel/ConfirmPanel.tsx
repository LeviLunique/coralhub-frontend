import { AlertTriangle } from 'lucide-react'
import { Button } from '../../../design-system/components'
import styles from './ConfirmPanel.module.css'

type ConfirmPanelProps = {
  title: string
  message: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmPanel({ title, message, confirmLabel, onCancel, onConfirm }: ConfirmPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.heading}>
        <span className={styles.icon}><AlertTriangle size={20} /></span>
        <h3 className={styles.title}>{title}</h3>
      </div>
      <p className={styles.message}>{message}</p>
      <p className={styles.warning}>Esta operação não pode ser desfeita.</p>
      <div className={styles.actions}>
        <Button onClick={onCancel} variant="quiet">Cancelar</Button>
        <Button onClick={onConfirm} variant="danger">{confirmLabel}</Button>
      </div>
    </div>
  )
}
