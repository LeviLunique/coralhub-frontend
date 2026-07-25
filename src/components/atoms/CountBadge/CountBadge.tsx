import styles from './CountBadge.module.css'

type CountBadgeProps = {
  count: number
  active?: boolean
}

export function CountBadge({ count, active = false }: CountBadgeProps) {
  return <span className={`${styles.badge} ${active ? styles.active : ''}`}>{count}</span>
}
