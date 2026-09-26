import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Archive, ArchiveRestore, ChevronLeft, ChevronRight, Download, FileMusic, MoreHorizontal, Music, Pin, Share2, SquarePen, Trash2 } from 'lucide-react'
import type { Instrument, Material, MaterialType, Song } from '../../../types'
import { Button, IconButton } from '../../../design-system/components'
import { blankMaterial } from '../../../lib/factories'
import { isAudioMaterial, isVideoMaterial, materialDestinoLabel, materialTypeLabels, sectionOf, NOTES_DOC_ID } from '../../../lib/materials'
import type { MaterialSection } from '../../../lib/materials'
import { emptyFilter } from '../../../lib/materialFilter'
import type { FilterState } from '../../../lib/materialFilter'
import { downloadText, shareOrCopy } from '../../../utils/fileActions'
import { youtubeEmbedURL } from '../../../lib/youtube'
import type { AnnotationLayer } from '../../../lib/annotations'
import { AddMaterialForm } from '../../molecules/AddMaterialForm'
import type { NewMaterialDraft } from '../../molecules/AddMaterialForm'
import { DropdownMenu } from '../../molecules/DropdownMenu'
import type { MenuItem } from '../../molecules/DropdownMenu'
import { MediaAddDrawer } from '../../molecules/MediaAddDrawer'
import { DeleteMaterialDrawer } from '../../molecules/DeleteMaterialDrawer'
import { DisplayMenu } from '../../molecules/DisplayMenu'
import type { DisplayFit } from '../../molecules/DisplayMenu'
import { AnnotationOverlay } from '../../molecules/AnnotationOverlay'
import { SongMaterialPanel } from '../SongMaterialPanel'
import type { AudioTrackMix } from '../SongMaterialPanel'
import { AudioPlayerDock } from '../AudioPlayerDock'
import { AnnotationEditor } from '../AnnotationEditor'
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

function readSavedAnnotations(songID: string): Record<string, AnnotationLayer[]> {
  try {
    const value = localStorage.getItem(`coralhub-annotations-${songID}`)
    return value ? JSON.parse(value) as Record<string, AnnotationLayer[]> : {}
  } catch {
    return {}
  }
}

export function SongView({ song, materials, instruments, canManage, onBack, onTogglePin, onToggleArchive, onCreateInstrument, onSaveMaterial, onDeleteMaterial }: SongViewProps) {
  const [scoreFilter, setScoreFilter] = useState<FilterState>(emptyFilter)
  const [mediaFilter, setMediaFilter] = useState<FilterState>(emptyFilter)
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const [adding, setAdding] = useState<MaterialSection | null>(null)
  const [mediaDrawerOpen, setMediaDrawerOpen] = useState(false)
  const [expandedMediaID, setExpandedMediaID] = useState<string | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Material | null>(null)
  const [audioMixes, setAudioMixes] = useState<Record<string, AudioTrackMix>>({})
  const [displayFit, setDisplayFit] = useState<DisplayFit>('height')
  const [pageTurnControls, setPageTurnControls] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [annotationEditorOpen, setAnnotationEditorOpen] = useState(false)
  const [annotationLayersByScore, setAnnotationLayersByScore] = useState<Record<string, AnnotationLayer[]>>(() => readSavedAnnotations(song.id))
  const [annotationsVisibleByScore, setAnnotationsVisibleByScore] = useState<Record<string, boolean>>({})
  const canvasRef = useRef<HTMLDivElement>(null)

  const bySection = useMemo(() => {
    const visible = materials.filter((material) => canManage || !material.archived)
    return {
      scores: visible.filter((material) => sectionOf(material) === 'scores'),
      media: visible.filter((material) => sectionOf(material) === 'media'),
      notes: visible.filter((material) => sectionOf(material) === 'notes'),
    }
  }, [materials, canManage])

  // Resolve which document is shown in the viewer, falling back to a sensible default.
  const fallbackID = bySection.scores[0]?.id ?? bySection.media.find((material) => !isVideoMaterial(material))?.id ?? (song.notes ? NOTES_DOC_ID : bySection.notes[0]?.id ?? null)
  const activeID = selectedID ?? fallbackID
  const selectedMaterial = activeID && activeID !== NOTES_DOC_ID ? materials.find((material) => material.id === activeID) ?? null : null
  const audioTracks = bySection.media.filter(isAudioMaterial)
  const scoreFocused = selectedMaterial?.material_type === 'sheet_music'
  const annotationLayers = scoreFocused && selectedMaterial ? annotationLayersByScore[selectedMaterial.id] ?? [] : []
  const annotationsVisible = scoreFocused && selectedMaterial ? annotationsVisibleByScore[selectedMaterial.id] ?? true : true

  useEffect(() => {
    localStorage.setItem(`coralhub-annotations-${song.id}`, JSON.stringify(annotationLayersByScore))
  }, [annotationLayersByScore, song.id])

  useEffect(() => {
    function syncFullscreen() {
      setFullscreen(document.fullscreenElement === canvasRef.current)
    }
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await canvasRef.current?.requestFullscreen()
    }
  }

  function updateAudioMix(materialID: string, patch: Partial<AudioTrackMix>) {
    setAudioMixes((current) => {
      const existing = current[materialID]
      const base: AudioTrackMix = existing ?? {
        muted: false,
        solo: false,
        volume: 0.8,
        reverb: 0,
        optionsOpen: false,
      }
      return { ...current, [materialID]: { ...base, ...patch } }
    })
  }

  function selectItem(id: string) {
    setSelectedID(id)
    setAdding(null)
  }

  function saveAnnotations(layers: AnnotationLayer[]) {
    if (!selectedMaterial) return
    setAnnotationLayersByScore((current) => ({ ...current, [selectedMaterial.id]: layers }))
    setAnnotationsVisibleByScore((current) => ({ ...current, [selectedMaterial.id]: true }))
    setAnnotationEditorOpen(false)
  }

  function toggleAnnotationLayer(layerID: string) {
    if (!selectedMaterial) return
    setAnnotationLayersByScore((current) => ({
      ...current,
      [selectedMaterial.id]: (current[selectedMaterial.id] ?? []).map((layer) => layer.id === layerID ? { ...layer, visible: !layer.visible } : layer),
    }))
  }

  function addMaterial(draft: NewMaterialDraft) {
    const material: Material = {
      ...blankMaterial(song.tenant_id, song.choir_id, song.id),
      name: draft.name,
      material_type: draft.material_type,
      target_type: draft.target_type,
      voice_labels: draft.voice_labels,
      instrument_ids: draft.instrument_ids,
      file_name: draft.file_name,
      content_type: draft.content_type,
      size_bytes: draft.size_bytes,
      external_url: draft.external_url,
      preview_url: draft.preview_url,
    }
    onSaveMaterial(material)
    setAdding(null)
    setMediaDrawerOpen(false)
    if (isVideoMaterial(material) || isAudioMaterial(material)) {
      setExpandedMediaID(material.id)
    } else {
      setSelectedID(material.id)
    }
  }

  function renameMaterial(materialID: string, name: string) {
    const material = materials.find((item) => item.id === materialID)
    if (!material) {
      return
    }
    onSaveMaterial({ ...material, name, updated_at: new Date().toISOString() })
  }

  function requestDeleteMaterial(materialID: string) {
    const material = materials.find((item) => item.id === materialID)
    if (material) {
      setDeleteCandidate(material)
    }
  }

  function confirmDeleteMaterial() {
    if (!deleteCandidate) {
      return
    }
    const materialID = deleteCandidate.id
    if (expandedMediaID === materialID) {
      setExpandedMediaID(null)
    }
    if (selectedID === materialID) {
      setSelectedID(null)
    }
    onDeleteMaterial(materialID)
    setDeleteCandidate(null)
  }

  function startAdding(section: MaterialSection) {
    if (section === 'media') {
      setMediaDrawerOpen(true)
      return
    }
    setAdding(section)
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
      return <FocusedAudioViewer instruments={instruments} material={selectedMaterial} />
    }
    if (isVideoMaterial(selectedMaterial)) {
      return <FocusedVideoViewer material={selectedMaterial} />
    }
    return <SheetViewer annotationLayers={annotationLayers} annotationsVisible={annotationsVisible} displayFit={displayFit} instruments={instruments} material={selectedMaterial} song={song} />
  }

  const isNotesDoc = activeID === NOTES_DOC_ID

  function shareCurrent() {
    if (selectedMaterial) {
      void shareOrCopy({ title: song.title, text: selectedMaterial.external_url ? `${selectedMaterial.name}\n${selectedMaterial.external_url}` : selectedMaterial.name })
    } else if (isNotesDoc) {
      void shareOrCopy({ title: song.title, text: `Anotações — ${song.notes ?? ''}` })
    }
  }

  function downloadCurrent() {
    if (selectedMaterial) {
      if (selectedMaterial.external_url) {
        window.open(selectedMaterial.external_url, '_blank', 'noopener,noreferrer')
        return
      }
      // Backend file bytes are not available offline; hand off what we have so the action still responds.
      const base = selectedMaterial.file_name ?? `${selectedMaterial.name}.txt`
      downloadText(base, `${selectedMaterial.name}\n${materialTypeLabels[selectedMaterial.material_type]} · ${materialDestinoLabel(selectedMaterial, instruments)}`)
    } else if (isNotesDoc) {
      downloadText(`${song.title} - anotações.txt`, song.notes ?? '')
    }
  }

  function downloadLabel(): string {
    if (!selectedMaterial) {
      return 'Baixar anotações'
    }
    if (selectedMaterial.material_type === 'sheet_music') {
      return 'Baixar PDF'
    }
    if (selectedMaterial.external_url) {
      return 'Abrir no YouTube'
    }
    if (isAudioMaterial(selectedMaterial)) {
      return 'Baixar áudio'
    }
    return 'Baixar arquivo'
  }

  const moreItems: MenuItem[] = []
  if (selectedMaterial || isNotesDoc) {
    moreItems.push({ key: 'share', label: 'Compartilhar', icon: <Share2 size={16} />, onClick: shareCurrent })
    moreItems.push({ key: 'download', label: downloadLabel(), icon: <Download size={16} />, onClick: downloadCurrent })
  }
  if (selectedMaterial && canManage) {
    moreItems.push({
      key: 'archive',
      label: selectedMaterial.archived ? 'Reativar' : 'Arquivar',
      icon: selectedMaterial.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />,
      onClick: () => onSaveMaterial({ ...selectedMaterial, archived: !selectedMaterial.archived, updated_at: new Date().toISOString() }),
    })
    moreItems.push({
      key: 'delete',
      label: 'Excluir',
      icon: <Trash2 size={16} />,
      danger: true,
      onClick: () => requestDeleteMaterial(selectedMaterial.id),
    })
  }

  if (annotationEditorOpen && scoreFocused && selectedMaterial) {
    return (
      <AnnotationEditor
        initialLayers={annotationLayers}
        instruments={instruments}
        material={selectedMaterial}
        onCancel={() => setAnnotationEditorOpen(false)}
        onSave={saveAnnotations}
        song={song}
      />
    )
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
          {scoreFocused ? (
            <DisplayMenu
              fit={displayFit}
              fullscreen={fullscreen}
              onFitChange={setDisplayFit}
              onToggleFullscreen={() => void toggleFullscreen()}
              onTogglePageTurnControls={() => setPageTurnControls((value) => !value)}
              pageTurnControls={pageTurnControls}
            />
          ) : null}
          {moreItems.length > 0 ? (
            <DropdownMenu
              align="right"
              items={moreItems}
              trigger={({ open, toggle }) => (
                <IconButton active={open} label="Mais ações" onClick={toggle}><MoreHorizontal size={18} /></IconButton>
              )}
            />
          ) : null}
          {scoreFocused ? <IconButton label="Anotar partitura" onClick={() => setAnnotationEditorOpen(true)}><SquarePen size={18} /></IconButton> : null}
          {moreItems.length > 0 || scoreFocused ? <span className={styles.topDivider} /> : null}
          <IconButton active={song.favorite} label={song.favorite ? 'Remover dos favoritos' : 'Favoritar'} onClick={onTogglePin}><Pin fill={song.favorite ? 'currentColor' : 'none'} size={18} /></IconButton>
          {canManage ? <IconButton label={song.archived ? 'Reativar música' : 'Arquivar música'} onClick={onToggleArchive}>{song.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}</IconButton> : null}
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.canvas} ref={canvasRef}>
          {renderViewer()}
          {scoreFocused && pageTurnControls ? (
            <div aria-label="Controles de página" className={styles.pageTurnControls}>
              <button aria-label="Página anterior" disabled type="button"><ChevronLeft size={24} /></button>
              <span>1 / 1</span>
              <button aria-label="Próxima página" disabled type="button"><ChevronRight size={24} /></button>
            </div>
          ) : null}
        </div>

        <aside aria-label="Painel da música" className={styles.rail}>
          <SongMaterialPanel
            activeID={activeID}
            annotationLayers={annotationLayers}
            annotationsVisible={annotationsVisible}
            audioMixes={audioMixes}
            canManage={canManage}
            expandedMediaID={expandedMediaID}
            instruments={instruments}
            media={bySection.media}
            mediaFilter={mediaFilter}
            notes={bySection.notes}
            notesDocLabel={song.notes ? 'Anotações da música' : null}
            onAdd={startAdding}
            onAudioMixChange={updateAudioMix}
            onDeleteMaterial={requestDeleteMaterial}
            onFocusMaterial={selectItem}
            onMediaFilterChange={setMediaFilter}
            onRenameMaterial={renameMaterial}
            onScoreFilterChange={setScoreFilter}
            onSelect={selectItem}
            onToggleAllAnnotations={() => {
              if (!selectedMaterial) return
              setAnnotationsVisibleByScore((current) => ({ ...current, [selectedMaterial.id]: !annotationsVisible }))
            }}
            onToggleAnnotationLayer={toggleAnnotationLayer}
            onToggleMedia={(materialID) => setExpandedMediaID((current) => current === materialID ? null : materialID)}
            scoreFilter={scoreFilter}
            scores={bySection.scores}
          />
        </aside>
      </div>

      <AudioPlayerDock
        canRecord={canManage}
        mixes={audioMixes}
        onAddRecording={addMaterial}
        tracks={audioTracks}
      />

      {mediaDrawerOpen ? (
        <MediaAddDrawer
          instruments={instruments}
          onAdd={addMaterial}
          onClose={() => setMediaDrawerOpen(false)}
          onCreateInstrument={onCreateInstrument}
        />
      ) : null}
      {deleteCandidate ? (
        <DeleteMaterialDrawer
          material={deleteCandidate}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={confirmDeleteMaterial}
        />
      ) : null}
    </div>
  )
}

// Sheet music: shown as a document page (a real file would embed as a PDF here).
function SheetViewer({ material, instruments, song, displayFit, annotationLayers, annotationsVisible }: { material: Material; instruments: Instrument[]; song: Song; displayFit: DisplayFit; annotationLayers: AnnotationLayer[]; annotationsVisible: boolean }) {
  return (
    <div className={`${styles.pageScroll} ${displayFit === 'height' ? styles.pageScrollFitHeight : styles.pageScrollFitWidth}`}>
      <div className={`${styles.page} ${styles.sheetPage} ${displayFit === 'height' ? styles.pageFitHeight : styles.pageFitWidth}`}>
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
        <AnnotationOverlay allVisible={annotationsVisible} layers={annotationLayers} />
      </div>
    </div>
  )
}

function FocusedVideoViewer({ material }: { material: Material }) {
  const embedURL = material.external_url ? youtubeEmbedURL(material.external_url) : null
  return (
    <div className={styles.focusedMedia}>
      <div className={styles.focusedVideoFrame}>
        {embedURL ? (
          <iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen src={embedURL} title={material.name} />
        ) : material.preview_url ? (
          <video controls playsInline src={material.preview_url}>Seu navegador não suporta a reprodução deste vídeo.</video>
        ) : <p>Prévia indisponível para este vídeo.</p>}
      </div>
      <h3>{material.name}</h3>
    </div>
  )
}

function FocusedAudioViewer({ material, instruments }: { material: Material; instruments: Instrument[] }) {
  return (
    <div className={styles.focusedAudio}>
      <span className={styles.focusedAudioIcon}><Music size={64} /></span>
      <h3>{material.name}</h3>
      <p>{materialTypeLabels[material.material_type]} · {materialDestinoLabel(material, instruments)}</p>
      <small>Use o player inferior para controlar a reprodução.</small>
    </div>
  )
}
