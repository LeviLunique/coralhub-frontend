import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styles from './DropdownMenu.module.css'

export type MenuItem = {
  key: string
  label: string
  icon?: ReactNode
  onClick: () => void
  danger?: boolean
}

type DropdownMenuProps = {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode
  items: MenuItem[]
  align?: 'left' | 'right'
}

export function DropdownMenu({ trigger, items, align = 'right' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={styles.root} ref={ref}>
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      {open ? (
        <div className={`${styles.menu} ${align === 'left' ? styles.left : styles.right}`} role="menu">
          {items.map((item) => (
            <button
              className={`${styles.item} ${item.danger ? styles.danger : ''}`}
              key={item.key}
              onClick={() => { setOpen(false); item.onClick() }}
              role="menuitem"
              type="button"
            >
              {item.icon ? <span className={styles.icon}>{item.icon}</span> : null}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
