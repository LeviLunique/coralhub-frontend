import { FileText, Music } from 'lucide-react'
import type { Instrument, Material } from '../../../types'
import { isAudioMaterial, NOTES_DOC_ID } from '../../../lib/materials'
import type { MaterialSection } from '../../../lib/materials'
import { applyFilter, instrumentOptionsOf, voiceOptionsOf } from '../../../lib/materialFilter'
import type { FilterState } from '../../../lib/materialFilter'
import { PanelAddButton } from '../../atoms/PanelAddButton'
import { PanelItem } from '../../molecules/PanelItem'
import { PanelSection } from '../../molecules/PanelSection'
import { TargetFilter } from '../../molecules/TargetFilter'
import styles from './SongMaterialPanel.module.css'

type FilterableSection = Exclude<MaterialSection, 'notes'>

type SongMaterialPanelProps = {
  scores: Material[]
  media: Material[]
  notes: Material[]
  instruments: Instrument[]
  canManage: boolean
  activeID: string | null
  scoreFilter: FilterState
  mediaFilter: FilterState
  notesDocLabel: string | null
  onScoreFilterChange: (filter: FilterState) => void
  onMediaFilterChange: (filter: FilterState) => void
  onSelect: (id: string) => void
  onAdd: (section: MaterialSection) => void
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
  scoreFilter,
  mediaFilter,
  notesDocLabel,
  onScoreFilterChange,
  onMediaFilterChange,
  onSelect,
  onAdd,
}: SongMaterialPanelProps) {
  const instrumentName = (id: string) => instruments.find((instrument) => instrument.id === id)?.name ?? 'Instrumento'

  function renderItems(list: Material[], emptyLabel: string, hasLead: boolean) {
    if (list.length === 0 && !hasLead) {
      return <p className={styles.empty}>{emptyLabel}</p>
    }
    return list.map((material) => (
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
    </div>
  )
}
