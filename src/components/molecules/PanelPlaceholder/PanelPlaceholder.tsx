import { EmptyArt } from '../../atoms/EmptyArt'
import styles from './PanelPlaceholder.module.css'

type PanelPlaceholderProps = {
  title: string
  description: string
  hint?: string
}

export function PanelPlaceholder({ title, description, hint }: PanelPlaceholderProps) {
  return (
    <div className={styles.placeholder}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      <EmptyArt size={140} />
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  )
}
