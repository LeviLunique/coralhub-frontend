import { useState } from 'react'
import { ArrowLeft, Archive, ArchiveRestore, Download, FileText, Filter, Music, Pin } from 'lucide-react'
import type { Instrument, Material, Song, User } from '../../../types'
import { Badge, Button, IconButton } from '../../../design-system/components'
import { formatBytes } from '../../../utils/format'
import { blankMaterial } from '../../../lib/factories'
import { toggleInArray } from '../../../lib/collections'
import { isAudioMaterial, materialDestinoLabel, materialMatchesRoleDefault, materialTypeLabels, materialTypeOrder } from '../../../lib/materials'
import { voiceLabelDisplay, voiceOrder } from '../../../lib/voice'
import { IconActionButton } from '../../atoms/IconActionButton'
import { AddMaterialForm } from '../../molecules/AddMaterialForm'
import type { NewMaterialDraft } from '../../molecules/AddMaterialForm'
import styles from './SongView.module.css'

type SongViewProps = {
  song: Song
  materials: Material[]
  instruments: Instrument[]
  user: User
  canManage: boolean
  onBack: () => void
  onTogglePin: () => void
  onToggleArchive: () => void
  onCreateInstrument: (name: string) => Instrument
  onSaveMaterial: (material: Material) => void
  onDeleteMaterial: (materialID: string) => void
}

export function SongView({ song, materials, instruments, user, canManage, onBack, onTogglePin, onToggleArchive, onCreateInstrument, onSaveMaterial, onDeleteMaterial }: SongViewProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [voiceFilters, setVoiceFilters] = useState<string[]>([])
  const [instrumentFilters, setInstrumentFilters] = useState<string[]>([])
  const [adding, setAdding] = useState(false)

  const isFiltered = voiceFilters.length > 0 || instrumentFilters.length > 0
  const voiceChips = Array.from(new Set([...voiceOrder.map((voice) => voice as string), ...materials.flatMap((material) => material.voice_labels)]))
  const instrumentChips = Array.from(new Set(materials.flatMap((material) => material.instrument_ids)))

  function matches(material: Material): boolean {
    if (material.archived && !canManage) {
      return false
    }
    if (!isFiltered) {
      return materialMatchesRoleDefault(material, user, instruments)
    }
    if (material.target_type === 'voice') {
      return voiceFilters.length > 0 && (material.voice_labels.length === 0 || material.voice_labels.some((label) => voiceFilters.includes(label)))
    }
    return instrumentFilters.length > 0 && (material.instrument_ids.length === 0 || material.instrument_ids.some((id) => instrumentFilters.includes(id)))
  }

  const visible = materials.filter(matches)

  function addMaterial(draft: NewMaterialDraft) {
    onSaveMaterial({
      ...blankMaterial(song.tenant_id, song.choir_id, song.id),
      name: draft.name,
      material_type: draft.material_type,
      target_type: draft.target_type,
      voice_labels: draft.voice_labels,
      instrument_ids: draft.instrument_ids,
    })
    setAdding(false)
  }

  return (
    <div className={styles.view}>
      <header className={styles.topbar}>
        <Button icon={<ArrowLeft className="button__icon" size={16} />} onClick={onBack} variant="quiet">Músicas</Button>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>{song.title}</h2>
          <span className={styles.subtitle}>{song.composer ?? 'Compositor não informado'}{song.song_key ? ` · ${song.song_key}` : ''}</span>
        </div>
        <div className={styles.topActions}>
          <IconButton active={song.favorite} label={song.favorite ? 'Remover dos favoritos' : 'Favoritar'} onClick={onTogglePin}><Pin fill={song.favorite ? 'currentColor' : 'none'} size={18} /></IconButton>
          {canManage ? <IconButton label={song.archived ? 'Reativar' : 'Arquivar'} onClick={onToggleArchive}>{song.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}</IconButton> : null}
        </div>
      </header>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h3 className={styles.panelTitle}>Materiais <span className={styles.countBadge}>{visible.length}</span></h3>
            <p className={styles.panelHint}>Arquivos da música, marcados por destino e tipo.</p>
          </div>
          <div className={styles.panelActions}>
            <IconActionButton active={showFilters} label="Filtros" onClick={() => setShowFilters((value) => !value)}><Filter size={18} /></IconActionButton>
          </div>
        </div>

        {showFilters ? (
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <strong>Tipo de voz</strong>
              <div className={styles.chips}>
                {voiceChips.map((label) => (
                  <button className={`${styles.chip} ${voiceFilters.includes(label) ? styles.chipActive : ''}`} key={label} onClick={() => setVoiceFilters((current) => toggleInArray(current, label))} type="button">{voiceLabelDisplay(label)}</button>
                ))}
              </div>
            </div>
            <div className={styles.filterGroup}>
              <strong>Instrumentos</strong>
              <div className={styles.chips}>
                {instrumentChips.length === 0 ? <small className={styles.muted}>Nenhum instrumento nos materiais.</small> : instrumentChips.map((id) => (
                  <button className={`${styles.chip} ${instrumentFilters.includes(id) ? styles.chipActive : ''}`} key={id} onClick={() => setInstrumentFilters((current) => toggleInArray(current, id))} type="button">{instruments.find((instrument) => instrument.id === id)?.name ?? 'Instrumento'}</button>
                ))}
              </div>
            </div>
            {isFiltered ? <Button onClick={() => { setVoiceFilters([]); setInstrumentFilters([]) }} size="sm" variant="quiet">Limpar filtros</Button> : <small className={styles.muted}>Exibindo os materiais adequados ao seu perfil.</small>}
          </div>
        ) : null}

        {visible.length === 0 ? (
          <p className={styles.muted}>Nenhum material para exibir.</p>
        ) : (
          materialTypeOrder.map((type) => {
            const group = visible.filter((material) => material.material_type === type)
            if (group.length === 0) {
              return null
            }
            return (
              <div className={styles.group} key={type}>
                <h4 className={styles.groupTitle}>{materialTypeLabels[type]}</h4>
                <div className={styles.list}>
                  {group.map((material) => (
                    <div className={`${styles.row} ${material.archived ? styles.rowArchived : ''}`} key={material.id}>
                      <span className={styles.rowFile}>
                        {isAudioMaterial(material) ? <Music size={16} /> : <FileText size={16} />}
                        <span>
                          <strong>{material.name}</strong>
                          <small>{materialDestinoLabel(material, instruments)}{material.size_bytes ? ` · ${formatBytes(material.size_bytes)}` : ''}</small>
                        </span>
                      </span>
                      <span className={styles.rowActions}>
                        <Button size="sm" variant="quiet">{isAudioMaterial(material) ? 'Ouvir' : 'Visualizar'}</Button>
                        <Button icon={<Download className="button__icon" size={14} />} size="sm" variant="quiet">Baixar</Button>
                        {canManage ? <Button onClick={() => onSaveMaterial({ ...material, archived: !material.archived, updated_at: new Date().toISOString() })} size="sm" variant="quiet">{material.archived ? 'Reativar' : 'Arquivar'}</Button> : null}
                        {canManage ? <Button onClick={() => onDeleteMaterial(material.id)} size="sm" variant="danger">Excluir</Button> : null}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}

        {canManage ? (
          adding ? (
            <AddMaterialForm instruments={instruments} onAdd={addMaterial} onCreateInstrument={onCreateInstrument} />
          ) : (
            <Button onClick={() => setAdding(true)} variant="secondary">+ Adicionar material</Button>
          )
        ) : null}
        {canManage && song.archived ? <Badge tone="neutral">Música arquivada</Badge> : null}
      </section>
    </div>
  )
}
