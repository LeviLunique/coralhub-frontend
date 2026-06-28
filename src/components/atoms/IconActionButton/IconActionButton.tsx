import type { ReactNode } from 'react'
import styles from './IconActionButton.module.css'

type IconActionButtonProps = {
  label: string
  onClick?: () => void
  children: ReactNode
  variant?: 'default' | 'danger' | 'accent'
  active?: boolean
  size?: 'sm' | 'md'
}

export function IconActionButton({ label, onClick, children, variant = 'default', active = false, size = 'md' }: IconActionButtonProps) {
  const className = [styles.button, styles[variant], styles[size], active ? styles.active : ''].filter(Boolean).join(' ')
  return (
    <button aria-label={label} aria-pressed={active} className={className} onClick={(event) => { event.stopPropagation(); onClick?.() }} title={label} type="button">
      {children}
    </button>
  )
}
