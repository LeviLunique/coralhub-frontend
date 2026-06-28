import { Pin, X } from 'lucide-react'
import type { Song } from '../../../types'
import { Badge, IconButton } from '../../../design-system/components'
import { formatDate } from '../../../utils/format'
import { InlineEditField } from '../InlineEditField'
import styles from './SongInfoPanel.module.css'

type SongInfoPanelProps = {
  song: Song
  canManage: boolean
  onClose: () => void
  onSave: (song: Song) => void
  onTogglePin: () => void
}

export function SongInfoPanel({ song, canManage, onClose, onSave, onTogglePin }: SongInfoPanelProps) {
  function patch(changes: Partial<Song>) {
    onSave({ ...song, ...changes, updated_at: new Date().toISOString() })
  }

  return (
    <div className={styles.panel}>
      <div className="section-title">
        <div>
          <span className="eyebrow">Informações</span>
          <h2>{song.title}</h2>
        </div>
        <div className={styles.topActions}>
          <IconButton active={song.favorite} label={song.favorite ? 'Remover dos favoritos' : 'Favoritar'} onClick={onTogglePin}>
            <Pin fill={song.favorite ? 'currentColor' : 'none'} size={18} />
          </IconButton>
          <IconButton label="Fechar detalhes" onClick={onClose}><X size={18} /></IconButton>
        </div>
      </div>

      <InlineEditField canEdit={canManage} label="Título" onSave={(value) => patch({ title: value || song.title })} placeholder="Sem título" value={song.title} />
      <InlineEditField canEdit={canManage} label="Compositor" onSave={(value) => patch({ composer: value || undefined })} placeholder="Adicionar compositor" value={song.composer} />
      <InlineEditField canEdit={canManage} label="Observações" multiline onSave={(value) => patch({ notes: value || undefined })} placeholder="Adicionar observações" value={song.notes} />

      <div className="readonly-field">
        <span>Data de criação</span>
        <strong>{formatDate(song.created_at)}</strong>
      </div>
      <div className="readonly-field">
        <span>Status</span>
        <Badge tone={song.archived ? 'neutral' : 'green'}>{song.archived ? 'Arquivada' : 'Ativa'}</Badge>
      </div>
    </div>
  )
}
