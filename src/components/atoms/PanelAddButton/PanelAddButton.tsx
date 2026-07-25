import { Plus } from 'lucide-react'
import styles from './PanelAddButton.module.css'

type PanelAddButtonProps = {
  label: string
  onClick: () => void
}

export function PanelAddButton({ label, onClick }: PanelAddButtonProps) {
  return (
    <button className={styles.add} onClick={onClick} type="button">
      <span className={styles.icon}><Plus size={15} /></span>
      <span>{label}</span>
    </button>
  )
}
