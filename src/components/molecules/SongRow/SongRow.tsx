import { Archive, ArchiveRestore, Info, Music, Pin, Trash2, X } from 'lucide-react'
import type { Song } from '../../../types'
import { Badge } from '../../../design-system/components'
import { IconActionButton } from '../../atoms/IconActionButton'
import styles from './SongRow.module.css'

type SongRowProps = {
  song: Song
  materialsCount: number
  selectMode: boolean
  checked: boolean
  detailOpen: boolean
  onOpen: () => void
  onToggleCheck: () => void
  onToggleDetails: () => void
  onToggleArchive: () => void
  onRequestDelete: () => void
  onTogglePin: () => void
  canManage: boolean
}

export function SongRow({
  song,
  materialsCount,
  selectMode,
  checked,
  detailOpen,
  onOpen,
  onToggleCheck,
  onToggleDetails,
  onToggleArchive,
  onRequestDelete,
  onTogglePin,
  canManage,
}: SongRowProps) {
  const className = [styles.row, detailOpen ? styles.active : '', song.archived ? styles.archived : '', checked ? styles.checked : ''].filter(Boolean).join(' ')

  function handleClick() {
    if (selectMode) {
      onToggleCheck()
    } else {
      onOpen()
    }
  }

  return (
    <div className={className} onClick={handleClick} role="button" tabIndex={0}>
      {selectMode ? (
        <input checked={checked} className={styles.check} onChange={onToggleCheck} onClick={(event) => event.stopPropagation()} type="checkbox" />
      ) : (
        <IconActionButton active={song.favorite} label={song.favorite ? 'Remover dos favoritos' : 'Favoritar'} onClick={onTogglePin} size="sm" variant="accent">
          <Pin fill={song.favorite ? 'currentColor' : 'none'} size={16} />
        </IconActionButton>
      )}

      <span className={styles.icon}><Music size={18} /></span>

      <span className={styles.body}>
        <strong className={styles.titleText}>{song.title || 'Sem título'}</strong>
        <span className={styles.meta}>
          <small className={styles.metaText}>{song.composer ?? 'Compositor não informado'}</small>
          <span className={styles.sep} aria-hidden="true">·</span>
          <small className={styles.metaText}>{materialsCount} {materialsCount === 1 ? 'material' : 'materiais'}</small>
          <Badge tone={song.archived ? 'neutral' : 'green'}>{song.archived ? 'Arquivada' : 'Ativa'}</Badge>
        </span>
      </span>

      {!selectMode && canManage ? (
        <span className={styles.actions}>
          <IconActionButton active={detailOpen} label={detailOpen ? 'Fechar detalhes' : 'Detalhes'} onClick={onToggleDetails} size="sm">
            {detailOpen ? <X size={16} /> : <Info size={16} />}
          </IconActionButton>
          <IconActionButton label={song.archived ? 'Reativar' : 'Arquivar'} onClick={onToggleArchive} size="sm">
            {song.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          </IconActionButton>
          <IconActionButton label="Excluir" onClick={onRequestDelete} size="sm" variant="danger">
            <Trash2 size={16} />
          </IconActionButton>
        </span>
      ) : null}
    </div>
  )
}
