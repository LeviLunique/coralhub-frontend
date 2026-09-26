import { Download, Eye, EyeOff, FileText, Headphones, Layers3, Monitor, MoreHorizontal, Music, Pencil, Play, Trash2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Instrument, Material } from '../../../types'
import { isAudioMaterial, isVideoMaterial, NOTES_DOC_ID } from '../../../lib/materials'
import type { MaterialSection } from '../../../lib/materials'
import { applyFilter, instrumentOptionsOf, voiceOptionsOf } from '../../../lib/materialFilter'
import type { FilterState } from '../../../lib/materialFilter'
import type { AnnotationLayer } from '../../../lib/annotations'
import { youtubeEmbedURL } from '../../../lib/youtube'
import { PanelAddButton } from '../../atoms/PanelAddButton'
import { PanelItem } from '../../molecules/PanelItem'
import { PanelSection } from '../../molecules/PanelSection'
import { TargetFilter } from '../../molecules/TargetFilter'
import styles from './SongMaterialPanel.module.css'

type FilterableSection = Exclude<MaterialSection, 'notes'>

export type AudioTrackMix = {
  muted: boolean
  solo: boolean
  volume: number
  reverb: number
  optionsOpen: boolean
}

type SongMaterialPanelProps = {
  scores: Material[]
  media: Material[]
  notes: Material[]
  instruments: Instrument[]
  canManage: boolean
  activeID: string | null
  annotationLayers: AnnotationLayer[]
  annotationsVisible: boolean
  audioMixes: Record<string, AudioTrackMix>
  scoreFilter: FilterState
  mediaFilter: FilterState
  notesDocLabel: string | null
  onScoreFilterChange: (filter: FilterState) => void
  onMediaFilterChange: (filter: FilterState) => void
  onSelect: (id: string) => void
  onAdd: (section: MaterialSection) => void
  onToggleAllAnnotations: () => void
  onToggleAnnotationLayer: (layerID: string) => void
  onAudioMixChange: (materialID: string, patch: Partial<AudioTrackMix>) => void
  expandedMediaID: string | null
  onDeleteMaterial: (materialID: string) => void
  onFocusMaterial: (materialID: string) => void
  onRenameMaterial: (materialID: string, name: string) => void
  onToggleMedia: (materialID: string) => void
}

const SECTION_META: Record<MaterialSection, { title: string; addLabel: string; emptyLabel: string }> = {
  scores: { title: 'Partituras', addLabel: 'Adicionar partitura', emptyLabel: 'Nenhuma partitura.' },
  media: { title: 'Mídias', addLabel: 'Adicionar mídia', emptyLabel: 'Nenhuma mídia.' },
  notes: { title: 'Anotações', addLabel: 'Adicionar anotação', emptyLabel: 'Nenhuma anotação.' },
}

// The right-hand side panel of the song viewer: the three material sections,
// each with its audience filter, add action and selectable items.
export function SongMaterialPanel({
  scores,
  media,
  notes,
  instruments,
  canManage,
  activeID,
  annotationLayers,
  annotationsVisible,
  audioMixes,
  scoreFilter,
  mediaFilter,
  notesDocLabel,
  onScoreFilterChange,
  onMediaFilterChange,
  onSelect,
  onAdd,
  onToggleAllAnnotations,
  onToggleAnnotationLayer,
  onAudioMixChange,
  expandedMediaID,
  onDeleteMaterial,
  onFocusMaterial,
  onRenameMaterial,
  onToggleMedia,
}: SongMaterialPanelProps) {
  const instrumentName = (id: string) => instruments.find((instrument) => instrument.id === id)?.name ?? 'Instrumento'

  function renderItems(list: Material[], emptyLabel: string, hasLead: boolean) {
    if (list.length === 0 && !hasLead) {
      return <p className={styles.empty}>{emptyLabel}</p>
    }
    return list.map((material) => isVideoMaterial(material) || isAudioMaterial(material) ? (
      <PlayableMaterialItem
        expanded={expandedMediaID === material.id}
        key={material.id}
        material={material}
        mix={audioMixes[material.id] ?? { muted: false, solo: false, volume: 0.8, reverb: 0, optionsOpen: false }}
        onAudioMixChange={(patch) => onAudioMixChange(material.id, patch)}
        onDelete={() => onDeleteMaterial(material.id)}
        onFocus={() => onFocusMaterial(material.id)}
        onRename={(name) => onRenameMaterial(material.id, name)}
        onToggle={() => onToggleMedia(material.id)}
      />
    ) : (
      <PanelItem
        active={activeID === material.id}
        icon={isAudioMaterial(material) ? <Music size={16} /> : <FileText size={16} />}
        key={material.id}
        label={material.name}
        muted={material.archived}
        onClick={() => onSelect(material.id)}
      />
    ))
  }

  function renderFilterableSection(section: FilterableSection, all: Material[], filter: FilterState, onFilterChange: (filter: FilterState) => void) {
    const meta = SECTION_META[section]
    const visible = applyFilter(all, filter)
    const instrumentOptions = instrumentOptionsOf(all).map((id) => ({ id, name: instrumentName(id) }))
    return (
      <PanelSection count={all.length} title={meta.title}>
        <TargetFilter instrumentOptions={instrumentOptions} onChange={onFilterChange} value={filter} voiceOptions={voiceOptionsOf(all)} />
        {canManage ? <PanelAddButton label={meta.addLabel} onClick={() => onAdd(section)} /> : null}
        {renderItems(visible, meta.emptyLabel, false)}
      </PanelSection>
    )
  }

  const notesCount = notes.length + (notesDocLabel ? 1 : 0)

  return (
    <div aria-label="Seções da música" className={styles.panel} role="group">
      {renderFilterableSection('scores', scores, scoreFilter, onScoreFilterChange)}
      {renderFilterableSection('media', media, mediaFilter, onMediaFilterChange)}

      <PanelSection count={notesCount} title={SECTION_META.notes.title}>
        {canManage ? <PanelAddButton label={SECTION_META.notes.addLabel} onClick={() => onAdd('notes')} /> : null}
        {notesDocLabel ? (
          <PanelItem active={activeID === NOTES_DOC_ID} icon={<FileText size={16} />} label={notesDocLabel} onClick={() => onSelect(NOTES_DOC_ID)} />
        ) : null}
        {renderItems(notes, SECTION_META.notes.emptyLabel, Boolean(notesDocLabel))}
      </PanelSection>

      {annotationLayers.length > 0 ? (
        <PanelSection count={annotationLayers.length} title="Camadas">
          <div className={styles.layerHeading}>
            <span>Minhas camadas</span>
            <button onClick={onToggleAllAnnotations} type="button">{annotationsVisible ? 'Ocultar todas' : 'Exibir todas'}</button>
          </div>
          <div className={styles.annotationLayers}>
            {annotationLayers.map((layer) => (
              <div className={!annotationsVisible || !layer.visible ? styles.layerMuted : ''} key={layer.id}>
                <Layers3 size={16} />
                <span>{layer.name}</span>
                <button
                  aria-label={layer.visible ? `Ocultar ${layer.name}` : `Exibir ${layer.name}`}
                  disabled={!annotationsVisible}
                  onClick={() => onToggleAnnotationLayer(layer.id)}
                  type="button"
                >
                  {layer.visible && annotationsVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            ))}
          </div>
        </PanelSection>
      ) : null}
    </div>
  )
}

function PlayableMaterialItem({ material, expanded, mix, onToggle, onFocus, onRename, onDelete, onAudioMixChange }: {
  material: Material
  expanded: boolean
  mix: AudioTrackMix
  onToggle: () => void
  onFocus: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onAudioMixChange: (patch: Partial<AudioTrackMix>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(material.name)
  const embedURL = material.external_url ? youtubeEmbedURL(material.external_url) : null
  const localMediaURL = material.preview_url
  const isAudio = isAudioMaterial(material) && !isVideoMaterial(material)

  useEffect(() => setName(material.name), [material.name])

  function commitRename() {
    const nextName = name.trim()
    if (nextName && nextName !== material.name) {
      onRename(nextName)
    } else {
      setName(material.name)
    }
    setEditing(false)
  }

  function downloadLocalFile() {
    if (!localMediaURL) {
      return
    }
    const anchor = document.createElement('a')
    anchor.href = localMediaURL
    anchor.download = material.file_name ?? material.name
    anchor.click()
  }

  return (
    <div className={`${styles.videoItem} ${expanded ? styles.videoExpanded : ''}`}>
      <div
        aria-expanded={expanded}
        className={styles.videoRow}
        onClick={() => { if (!editing) onToggle() }}
        onKeyDown={(event) => {
          if (!editing && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            onToggle()
          }
        }}
        role="button"
        tabIndex={0}
      >
        <span className={styles.videoIcon}>{isAudio ? <Music size={14} /> : <Play fill="currentColor" size={12} />}</span>
        {editing ? (
          <input
            aria-label={isAudio ? 'Nome do áudio' : 'Nome do vídeo'}
            autoFocus
            className={styles.renameInput}
            onBlur={commitRename}
            onChange={(event) => setName(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Enter') commitRename()
              if (event.key === 'Escape') { setName(material.name); setEditing(false) }
            }}
            value={name}
          />
        ) : <span className={styles.videoLabel}>{material.name}</span>}
        <span className={styles.videoActions}>
          <button aria-label={`Exibir ${material.name} na tela principal`} onClick={(event) => { event.stopPropagation(); onFocus() }} type="button"><Monitor size={15} /></button>
          {isAudio && localMediaURL ? <button aria-label={`Baixar ${material.name}`} onClick={(event) => { event.stopPropagation(); downloadLocalFile() }} type="button"><Download size={15} /></button> : null}
          <button aria-label={`Renomear ${material.name}`} onClick={(event) => { event.stopPropagation(); setEditing(true) }} type="button"><Pencil size={15} /></button>
          <button aria-label={`Excluir ${material.name}`} className={styles.deleteAction} onClick={(event) => { event.stopPropagation(); onDelete() }} type="button"><Trash2 size={15} /></button>
        </span>
      </div>
      {expanded && isAudio ? (
        <div className={styles.audioMiniPlayer}>
          <div className={styles.audioMiniMeta}>
            <span>{material.file_name?.split('.').pop()?.toUpperCase() ?? 'ÁUDIO'}</span>
            <button aria-label={mix.optionsOpen ? 'Fechar opções do áudio' : 'Mais opções do áudio'} className={mix.optionsOpen ? styles.audioControlActive : ''} onClick={() => onAudioMixChange({ optionsOpen: !mix.optionsOpen })} type="button"><MoreHorizontal size={16} /></button>
          </div>
          <div className={styles.audioMiniControls}>
            <button aria-label={mix.muted ? `Ativar som de ${material.name}` : `Silenciar ${material.name}`} aria-pressed={mix.muted} className={mix.muted ? styles.audioControlActive : ''} onClick={() => onAudioMixChange({ muted: !mix.muted })} type="button">{mix.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
            <button aria-label={mix.solo ? `Desativar solo de ${material.name}` : `Solo ${material.name}`} aria-pressed={mix.solo} className={mix.solo ? styles.audioControlActive : ''} onClick={() => onAudioMixChange({ solo: !mix.solo })} type="button"><Headphones size={15} /></button>
            <input aria-label={`Volume de ${material.name}`} max="1" min="0" onInput={(event) => onAudioMixChange({ volume: Number(event.currentTarget.value) })} step="0.01" type="range" value={mix.volume} />
          </div>
          {mix.optionsOpen ? (
            <label className={styles.reverbControl}>
              <span>Reverb <strong>{mix.reverb}%</strong></span>
              <input aria-label={`Reverb de ${material.name}`} max="100" min="0" onInput={(event) => onAudioMixChange({ reverb: Number(event.currentTarget.value) })} type="range" value={mix.reverb} />
            </label>
          ) : null}
        </div>
      ) : expanded && (embedURL || localMediaURL) ? (
        <div className={isAudio ? styles.audioEmbed : styles.videoEmbed}>
          {embedURL ? (
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              src={embedURL}
              title={material.name}
            />
          ) : (
            <video controls playsInline preload="metadata" src={localMediaURL}>
              Seu navegador não suporta a reprodução deste vídeo.
            </video>
          )}
        </div>
      ) : null}
    </div>
  )
}
