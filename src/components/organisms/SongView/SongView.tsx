import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Archive, ArchiveRestore, Download, FileMusic, Music, Pause, Pin, Play, SkipBack, SkipForward, Trash2 } from 'lucide-react'
import type { Instrument, Material, MaterialType, Song } from '../../../types'
import { Button, IconButton } from '../../../design-system/components'
import { blankMaterial } from '../../../lib/factories'
import { isAudioMaterial, materialDestinoLabel, materialTypeLabels, sectionOf, NOTES_DOC_ID } from '../../../lib/materials'
import type { MaterialSection } from '../../../lib/materials'
import { emptyFilter } from '../../../lib/materialFilter'
import type { FilterState } from '../../../lib/materialFilter'
import { AddMaterialForm } from '../../molecules/AddMaterialForm'
import type { NewMaterialDraft } from '../../molecules/AddMaterialForm'
import { SongMaterialPanel } from '../SongMaterialPanel'
import styles from './SongView.module.css'

type SongViewProps = {
  song: Song
  materials: Material[]
  instruments: Instrument[]
  canManage: boolean
  onBack: () => void
  onTogglePin: () => void
  onToggleArchive: () => void
  onCreateInstrument: (name: string) => Instrument
  onSaveMaterial: (material: Material) => void
  onDeleteMaterial: (materialID: string) => void
}

const sectionDefaultType: Record<MaterialSection, MaterialType> = {
  scores: 'sheet_music',
  media: 'audio_guide',
  notes: 'lyrics',
}

const addFormTitle: Record<MaterialSection, string> = {
  scores: 'Adicionar partitura',
  media: 'Adicionar mídia',
  notes: 'Adicionar anotação',
}

export function SongView({ song, materials, instruments, canManage, onBack, onTogglePin, onToggleArchive, onCreateInstrument, onSaveMaterial, onDeleteMaterial }: SongViewProps) {
  const [scoreFilter, setScoreFilter] = useState<FilterState>(emptyFilter)
  const [mediaFilter, setMediaFilter] = useState<FilterState>(emptyFilter)
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const [adding, setAdding] = useState<MaterialSection | null>(null)
  const [railEl, setRailEl] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setRailEl(document.getElementById('song-detail-rail'))
  }, [])

  const bySection = useMemo(() => {
    const visible = materials.filter((material) => canManage || !material.archived)
    return {
      scores: visible.filter((material) => sectionOf(material) === 'scores'),
      media: visible.filter((material) => sectionOf(material) === 'media'),
      notes: visible.filter((material) => sectionOf(material) === 'notes'),
    }
  }, [materials, canManage])

  // Resolve which document is shown in the viewer, falling back to a sensible default.
  const fallbackID = bySection.scores[0]?.id ?? bySection.media[0]?.id ?? (song.notes ? NOTES_DOC_ID : bySection.notes[0]?.id ?? null)
  const activeID = selectedID ?? fallbackID
  const selectedMaterial = activeID && activeID !== NOTES_DOC_ID ? materials.find((material) => material.id === activeID) ?? null : null

  function selectItem(id: string) {
    setSelectedID(id)
    setAdding(null)
  }

  function addMaterial(draft: NewMaterialDraft) {
    const material: Material = {
      ...blankMaterial(song.tenant_id, song.choir_id, song.id),
      name: draft.name,
      material_type: draft.material_type,
      target_type: draft.target_type,
      voice_labels: draft.voice_labels,
      instrument_ids: draft.instrument_ids,
    }
    onSaveMaterial(material)
    setAdding(null)
    setSelectedID(material.id)
  }

  function renderViewer() {
    if (adding) {
      return (
        <div className={styles.pageScroll}>
          <div className={styles.page}>
            <div className={styles.pageForm}>
              <h3 className={styles.formTitle}>{addFormTitle[adding]}</h3>
              <AddMaterialForm defaultType={sectionDefaultType[adding]} instruments={instruments} onAdd={addMaterial} onCreateInstrument={onCreateInstrument} />
              <Button onClick={() => setAdding(null)} size="sm" variant="quiet">Cancelar</Button>
            </div>
          </div>
        </div>
      )
    }
    if (activeID === NOTES_DOC_ID) {
      return (
        <div className={styles.pageScroll}>
          <div className={styles.page}>
            <div className={styles.doc}>
              <span className={styles.docBrand}>{song.title}</span>
              <h3 className={styles.docHeading}>Anotações</h3>
              <p className={styles.docBody}>{song.notes}</p>
            </div>
          </div>
        </div>
      )
    }
    if (!selectedMaterial) {
      return (
        <div className={styles.pageScroll}>
          <div className={styles.empty}>
            <FileMusic size={40} />
            <strong>Nada para exibir</strong>
            <span>Selecione um item no painel ao lado ou adicione um novo material.</span>
          </div>
        </div>
      )
    }
    if (isAudioMaterial(selectedMaterial)) {
      return <AudioViewer key={selectedMaterial.id} instruments={instruments} material={selectedMaterial} />
    }
    return <SheetViewer instruments={instruments} material={selectedMaterial} song={song} />
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
          {selectedMaterial ? (
            <>
              <IconButton label="Baixar" onClick={() => undefined}><Download size={18} /></IconButton>
              {canManage ? <IconButton label={selectedMaterial.archived ? 'Reativar' : 'Arquivar'} onClick={() => onSaveMaterial({ ...selectedMaterial, archived: !selectedMaterial.archived, updated_at: new Date().toISOString() })}>{selectedMaterial.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}</IconButton> : null}
              {canManage ? <IconButton label="Excluir" onClick={() => { onDeleteMaterial(selectedMaterial.id); setSelectedID(null) }}><Trash2 size={18} /></IconButton> : null}
              <span className={styles.topDivider} />
            </>
          ) : null}
          <IconButton active={song.favorite} label={song.favorite ? 'Remover dos favoritos' : 'Favoritar'} onClick={onTogglePin}><Pin fill={song.favorite ? 'currentColor' : 'none'} size={18} /></IconButton>
          {canManage ? <IconButton label={song.archived ? 'Reativar música' : 'Arquivar música'} onClick={onToggleArchive}>{song.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}</IconButton> : null}
        </div>
      </header>

      <div className={styles.canvas}>{renderViewer()}</div>

      {railEl
        ? createPortal(
            <SongMaterialPanel
              activeID={activeID}
              canManage={canManage}
              instruments={instruments}
              media={bySection.media}
              mediaFilter={mediaFilter}
              notes={bySection.notes}
              notesDocLabel={song.notes ? 'Anotações da música' : null}
              onAdd={setAdding}
              onMediaFilterChange={setMediaFilter}
              onScoreFilterChange={setScoreFilter}
              onSelect={selectItem}
              scoreFilter={scoreFilter}
              scores={bySection.scores}
            />,
            railEl,
          )
        : null}
    </div>
  )
}

// Sheet music: shown as a document page (a real file would embed as a PDF here).
function SheetViewer({ material, instruments, song }: { material: Material; instruments: Instrument[]; song: Song }) {
  return (
    <div className={styles.pageScroll}>
      <div className={`${styles.page} ${styles.sheetPage}`}>
        <div className={styles.sheetHead}>
          <span className={styles.sheetTitle}>{song.title}</span>
          <span className={styles.sheetMeta}>{material.name} · {materialDestinoLabel(material, instruments)}</span>
        </div>
        <svg aria-hidden="true" className={styles.sheetSvg} preserveAspectRatio="xMidYMin meet" viewBox="0 0 520 640">
          {Array.from({ length: 9 }).map((_, system) => {
            const top = 24 + system * 68
            return (
              <g key={system}>
                {Array.from({ length: 5 }).map((__, line) => (
                  <line key={line} stroke="currentColor" strokeWidth="1" x1="8" x2="512" y1={top + line * 9} y2={top + line * 9} />
                ))}
                <path d={`M14 ${top - 6} q10 4 0 20 q-10 8 0 22`} fill="none" stroke="currentColor" strokeWidth="2" />
              </g>
            )
          })}
        </svg>
        <span className={styles.sheetFooter}>Pré-visualização ilustrativa · o PDF da partitura será exibido aqui.</span>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

// Audio: a music icon in the stage and a player docked at the bottom (simulated playback).
function AudioViewer({ material, instruments }: { material: Material; instruments: Instrument[] }) {
  const duration = Math.min(600, Math.max(75, Math.round((material.size_bytes ?? 6_000_000) / 30000)))
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!playing) {
      return
    }
    const id = window.setInterval(() => {
      setElapsed((current) => {
        if (current + 1 >= duration) {
          window.clearInterval(id)
          setPlaying(false)
          return duration
        }
        return current + 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [playing, duration])

  const percent = duration ? Math.min(100, (elapsed / duration) * 100) : 0

  function seek(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    setElapsed(Math.round(ratio * duration))
  }

  function skip(delta: number) {
    setElapsed((current) => Math.min(duration, Math.max(0, current + delta)))
  }

  return (
    <div className={styles.audioViewer}>
      <div className={styles.audioStage}>
        <span className={`${styles.audioDisc} ${playing ? styles.audioDiscSpin : ''}`}>
          <Music size={64} />
        </span>
        <h3 className={styles.audioName}>{material.name}</h3>
        <span className={styles.audioMeta}>{materialTypeLabels[material.material_type]} · {materialDestinoLabel(material, instruments)}</span>
      </div>

      <div className={styles.player}>
        <div className={styles.playerControls}>
          <button aria-label="Voltar 10s" className={styles.playerSkip} onClick={() => skip(-10)} type="button"><SkipBack size={18} /></button>
          <button aria-label={playing ? 'Pausar' : 'Reproduzir'} className={styles.playerPlay} onClick={() => setPlaying((value) => !value)} type="button">
            {playing ? <Pause fill="currentColor" size={22} /> : <Play fill="currentColor" size={22} />}
          </button>
          <button aria-label="Avançar 10s" className={styles.playerSkip} onClick={() => skip(10)} type="button"><SkipForward size={18} /></button>
        </div>
        <div className={styles.playerTrack}>
          <span className={styles.playerTime}>{formatTime(elapsed)}</span>
          <div className={styles.playerBar} onClick={seek} role="presentation">
            <div className={styles.playerFill} style={{ width: `${percent}%` }} />
            <div className={styles.playerThumb} style={{ left: `${percent}%` }} />
          </div>
          <span className={styles.playerTime}>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}
