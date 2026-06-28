import { CheckSquare, Plus } from 'lucide-react'
import { ToolbarButton } from '../../atoms/ToolbarButton'
import styles from './LibraryHeader.module.css'

type LibraryHeaderProps = {
  title: string
  count: number
  unit: [singular: string, plural: string]
  selectMode: boolean
  onToggleSelect: () => void
  onAdd?: () => void
  canAdd: boolean
}

export function LibraryHeader({ title, count, unit, selectMode, onToggleSelect, onAdd, canAdd }: LibraryHeaderProps) {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>
        {title} <span className={styles.count}>{count} {count === 1 ? unit[0] : unit[1]}</span>
      </h2>
      <div className={styles.actions}>
        <ToolbarButton active={selectMode} label="Selecionar" onClick={onToggleSelect}>
          <CheckSquare size={18} />
        </ToolbarButton>
        {canAdd ? (
          <ToolbarButton label="Adicionar" onClick={onAdd} variant="outline">
            <Plus size={18} />
          </ToolbarButton>
        ) : null}
      </div>
    </div>
  )
}
