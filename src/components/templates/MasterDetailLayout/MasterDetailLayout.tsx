import type { ReactNode } from 'react'
import styles from './MasterDetailLayout.module.css'

type MasterDetailLayoutProps = {
  main: ReactNode
  panel: ReactNode
}

export function MasterDetailLayout({ main, panel }: MasterDetailLayoutProps) {
  return (
    <div className={styles.layout}>
      <section className={styles.main}>{main}</section>
      <aside aria-label="Detalhes" className={styles.panel}>{panel}</aside>
    </div>
  )
}
