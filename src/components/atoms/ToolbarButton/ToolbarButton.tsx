import type { ReactNode } from 'react'
import styles from './ToolbarButton.module.css'

type ToolbarButtonProps = {
  label: string
  onClick?: () => void
  active?: boolean
  variant?: 'ghost' | 'outline'
  children: ReactNode
}

export function ToolbarButton({ label, onClick, active = false, variant = 'ghost', children }: ToolbarButtonProps) {
  const className = [styles.button, styles[variant], active ? styles.active : ''].filter(Boolean).join(' ')
  return (
    <button aria-label={label} aria-pressed={active} className={className} onClick={onClick} title={label} type="button">
      {children}
    </button>
  )
}
