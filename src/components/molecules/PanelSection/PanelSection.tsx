import type { ReactNode } from 'react'
import { CountBadge } from '../../atoms/CountBadge'
import styles from './PanelSection.module.css'

type PanelSectionProps = {
  title: string
  count: number
  children: ReactNode
}

// A titled section inside a side panel: heading + count badge, then its content.
export function PanelSection({ title, count, children }: PanelSectionProps) {
  return (
    <section className={styles.section}>
      <header className={styles.head}>
        <h3 className={styles.title}>{title}</h3>
        <CountBadge count={count} />
      </header>
      {children}
    </section>
  )
}
