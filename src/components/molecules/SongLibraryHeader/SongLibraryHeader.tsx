import { Archive, ArrowUpDown, CheckCheck, CheckSquare, MoreHorizontal, Plus, SquareDashed, Trash2, X } from 'lucide-react'
import { ToolbarButton } from '../../atoms/ToolbarButton'
import { IconActionButton } from '../../atoms/IconActionButton'
import { DropdownMenu } from '../DropdownMenu'
import styles from './SongLibraryHeader.module.css'

const SONG_SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'name-asc', label: 'Título A-Z' },
  { value: 'name-desc', label: 'Título Z-A' },
  { value: 'composer', label: 'Compositor' },
  { value: 'newest', label: 'Mais recente' },
]

type SongLibraryHeaderProps = {
  count: number
  hasSongs: boolean
  canManage: boolean
  selectMode: boolean
  sort: string
  onSortChange: (value: string) => void
  onEnterSelect: () => void
  onCreate: () => void
  onImport: () => void
  selectedCount: number
  allSelected: boolean
  onToggleSelectAll: () => void
  onArchiveSelected: () => void
  onDeleteSelected: () => void
  onAddSelectedToRepertoire: () => void
  onDuplicateSelected: () => void
  onExitSelect: () => void
}

function SortMenu({ sort, onSortChange }: { sort: string; onSortChange: (value: string) => void }) {
  return (
    <DropdownMenu
      items={SONG_SORT_OPTIONS.map((option) => ({ key: option.value, label: option.value === sort ? `✓ ${option.label}` : option.label, onClick: () => onSortChange(option.value) }))}
      trigger={({ toggle }) => (
        <IconActionButton label="Ordenar" onClick={toggle}><ArrowUpDown size={18} /></IconActionButton>
      )}
    />
  )
}

export function SongLibraryHeader({
  count,
  hasSongs,
  canManage,
  selectMode,
  sort,
  onSortChange,
  onEnterSelect,
  onCreate,
  onImport,
  selectedCount,
  allSelected,
  onToggleSelectAll,
  onArchiveSelected,
  onDeleteSelected,
  onAddSelectedToRepertoire,
  onDuplicateSelected,
  onExitSelect,
}: SongLibraryHeaderProps) {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>
        Músicas <span className={styles.count}>{count} {count === 1 ? 'música' : 'músicas'}</span>
        {selectMode ? <span className={styles.selected}>{selectedCount} {selectedCount === 1 ? 'selecionada' : 'selecionadas'}</span> : null}
      </h2>
      <div className={styles.actions}>
        {selectMode ? (
          <>
            <IconActionButton label="Arquivar selecionadas" onClick={onArchiveSelected}><Archive size={18} /></IconActionButton>
            <IconActionButton label="Excluir selecionadas" onClick={onDeleteSelected} variant="danger"><Trash2 size={18} /></IconActionButton>
            <DropdownMenu
              items={[
                { key: 'repertoire', label: 'Adicionar a um repertório', icon: <Plus size={16} />, onClick: onAddSelectedToRepertoire },
                { key: 'duplicate', label: 'Duplicar', icon: <CheckSquare size={16} />, onClick: onDuplicateSelected },
              ]}
              trigger={({ toggle }) => <IconActionButton label="Mais opções" onClick={toggle}><MoreHorizontal size={18} /></IconActionButton>}
            />
            <SortMenu onSortChange={onSortChange} sort={sort} />
            <IconActionButton label={allSelected ? 'Desselecionar tudo' : 'Selecionar tudo'} onClick={onToggleSelectAll}>
              {allSelected ? <SquareDashed size={18} /> : <CheckCheck size={18} />}
            </IconActionButton>
            <IconActionButton label="Sair da seleção" onClick={onExitSelect}><X size={18} /></IconActionButton>
          </>
        ) : (
          <>
            {hasSongs ? <ToolbarButton label="Selecionar" onClick={onEnterSelect}><CheckSquare size={18} /></ToolbarButton> : null}
            {hasSongs ? <SortMenu onSortChange={onSortChange} sort={sort} /> : null}
            {canManage ? (
              <DropdownMenu
                items={[
                  { key: 'new', label: 'Nova música', icon: <Plus size={16} />, onClick: onCreate },
                  { key: 'import', label: 'Importar arquivo PDF', icon: <Plus size={16} />, onClick: onImport },
                ]}
                trigger={({ toggle }) => <ToolbarButton label="Adicionar" onClick={toggle} variant="outline"><Plus size={18} /></ToolbarButton>}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
