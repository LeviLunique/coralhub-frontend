import type { ReactNode } from 'react'
import styles from './PanelItem.module.css'

type PanelItemProps = {
  icon: ReactNode
  label: string
  active?: boolean
  muted?: boolean
  onClick: () => void
}

// A selectable row inside a side panel (icon + label, with an active/selected state).
export function PanelItem({ icon, label, active = false, muted = false, onClick }: PanelItemProps) {
  return (
    <button className={`${styles.item} ${active ? styles.active : ''} ${muted ? styles.muted : ''}`} onClick={onClick} type="button">
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
    </button>
  )
}
