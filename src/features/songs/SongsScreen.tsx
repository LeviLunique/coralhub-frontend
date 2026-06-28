import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Instrument, Material, Repertoire, Song, User } from '../../types'
import { blankSong } from '../../lib/factories'
import { toggleInArray } from '../../lib/collections'
import { newID } from '../../lib/ids'
import { SongLibraryList } from '../../components/organisms/SongLibraryList'
import { SongView } from '../../components/organisms/SongView'
import { CreateSongPanel } from '../../components/molecules/CreateSongPanel'
import { SongInfoPanel } from '../../components/molecules/SongInfoPanel'
import { ConfirmPanel } from '../../components/molecules/ConfirmPanel'
import { PickRepertoirePanel } from '../../components/molecules/PickRepertoirePanel'

type SongsScreenProps = {
  choirID: string
  instruments: Instrument[]
  isManager: boolean
  materials: Material[]
  onBackFromDetail: () => void
  onCreateInstrument: (name: string) => Instrument
  onDeleteMaterial: (materialID: string) => void
  onDeleteSong: (songID: string) => void
  onSaveMaterial: (material: Material) => void
  onSaveRepertoire: (repertoire: Repertoire) => void
  onSaveSong: (song: Song) => void
  repertoires: Repertoire[]
  selectedSongID: string | null
  setSelectedSongID: (songID: string | null) => void
  songs: Song[]
  tenantID: string
  user: User
}

type PanelState =
  | { mode: 'placeholder' }
  | { mode: 'create'; phase: 'form' | 'importing'; importTitle?: string }
  | { mode: 'info'; songID: string }
  | { mode: 'confirm-delete'; songID: string }
  | { mode: 'confirm-delete-many' }
  | { mode: 'pick-repertoire' }

function sortSongs(songs: Song[], sort: string): Song[] {
  return songs.slice().sort((a, b) => {
    if (sort === 'name-desc') return b.title.localeCompare(a.title)
    if (sort === 'composer') return (a.composer ?? '').localeCompare(b.composer ?? '') || a.title.localeCompare(b.title)
    if (sort === 'newest') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    return a.title.localeCompare(b.title)
  })
}

export function SongsScreen(props: SongsScreenProps) {
  const { choirID, instruments, isManager, materials, onCreateInstrument, onDeleteMaterial, onDeleteSong, onSaveMaterial, onSaveRepertoire, onSaveSong, repertoires, selectedSongID, setSelectedSongID, songs, tenantID, user } = props

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('name-asc')
  const [selectMode, setSelectMode] = useState(false)
  const [checkedIDs, setCheckedIDs] = useState<string[]>([])
  const [panel, setPanel] = useState<PanelState>({ mode: 'placeholder' })
  const [viewSongID, setViewSongID] = useState<string | null>(null)
  const [railEl, setRailEl] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setRailEl(document.getElementById('song-detail-rail'))
  }, [])

  const railVisible = !viewSongID && panel.mode !== 'placeholder'

  useEffect(() => {
    const shell = document.querySelector('.app-shell')
    if (!shell) {
      return
    }
    shell.classList.toggle('is-rail-hidden', !railVisible)
    return () => shell.classList.remove('is-rail-hidden')
  }, [railVisible])

  useEffect(() => {
    if (selectedSongID === 'new') {
      setPanel({ mode: 'create', phase: 'form' })
      setViewSongID(null)
      setSelectedSongID(null)
    }
  }, [selectedSongID, setSelectedSongID])

  const term = query.trim().toLowerCase()
  const visibleSongs = sortSongs(
    songs.filter((song) => !term || song.title.toLowerCase().includes(term) || (song.composer ?? '').toLowerCase().includes(term)),
    sort,
  )
  const visibleIDs = visibleSongs.map((song) => song.id)
  const allSelected = visibleIDs.length > 0 && visibleIDs.every((id) => checkedIDs.includes(id))
  const viewSong = viewSongID ? songs.find((song) => song.id === viewSongID) ?? null : null
  const stamp = () => new Date().toISOString()

  function materialsCount(songID: string) {
    return materials.filter((material) => material.song_id === songID).length
  }

  function closePanel() {
    setPanel({ mode: 'placeholder' })
  }

  function toggleDetails(songID: string) {
    setPanel((current) => (current.mode === 'info' && current.songID === songID ? { mode: 'placeholder' } : { mode: 'info', songID }))
  }

  function startCreate() {
    setViewSongID(null)
    setPanel({ mode: 'create', phase: 'form' })
  }

  function continueCreate(title: string, composer: string) {
    const song: Song = { ...blankSong(tenantID, choirID), title: title || 'Nova música', composer: composer || undefined }
    onSaveSong(song)
    setPanel({ mode: 'create', phase: 'importing', importTitle: song.title })
    window.setTimeout(() => {
      setViewSongID(song.id)
      setPanel({ mode: 'placeholder' })
    }, 850)
  }

  function nextDuplicateName(base: string) {
    const count = songs.filter((song) => song.title === base || song.title.startsWith(`${base} (`)).length
    return `${base} (${count + 1})`
  }

  function duplicateSong(song: Song) {
    const now = stamp()
    const clone: Song = { ...song, id: newID('song'), title: nextDuplicateName(song.title), favorite: false, created_at: now, updated_at: now }
    onSaveSong(clone)
    materials.filter((material) => material.song_id === song.id).forEach((material) => onSaveMaterial({ ...material, id: newID('material'), song_id: clone.id, updated_at: now }))
  }

  function addSelectedToRepertoire(repertoireID: string) {
    const repertoire = repertoires.find((item) => item.id === repertoireID)
    if (!repertoire) {
      return
    }
    let order = repertoire.songs.reduce((max, entry) => Math.max(max, entry.execution_order), 0)
    const additions = checkedIDs
      .filter((id) => !repertoire.songs.some((entry) => entry.song_id === id))
      .map((id) => ({ song_id: id, execution_order: ++order }))
    onSaveRepertoire({ ...repertoire, songs: [...repertoire.songs, ...additions], updated_at: stamp() })
    closePanel()
    setSelectMode(false)
    setCheckedIDs([])
  }

  const header = {
    count: songs.length,
    hasSongs: songs.length > 0,
    canManage: isManager,
    selectMode,
    sort,
    onSortChange: setSort,
    onEnterSelect: () => { setSelectMode(true); setCheckedIDs([]) },
    onCreate: startCreate,
    onImport: startCreate,
    selectedCount: checkedIDs.length,
    allSelected,
    onToggleSelectAll: () => setCheckedIDs(allSelected ? [] : visibleIDs),
    onArchiveSelected: () => {
      const now = stamp()
      songs.filter((song) => checkedIDs.includes(song.id) && !song.archived).forEach((song) => onSaveSong({ ...song, archived: true, updated_at: now }))
      setCheckedIDs([])
    },
    onDeleteSelected: () => setPanel({ mode: 'confirm-delete-many' }),
    onAddSelectedToRepertoire: () => setPanel({ mode: 'pick-repertoire' }),
    onDuplicateSelected: () => {
      songs.filter((song) => checkedIDs.includes(song.id)).forEach(duplicateSong)
      setCheckedIDs([])
      setSelectMode(false)
    },
    onExitSelect: () => { setSelectMode(false); setCheckedIDs([]) },
  }

  if (viewSong) {
    return (
      <SongView
        canManage={isManager}
        instruments={instruments}
        materials={materials.filter((material) => material.song_id === viewSong.id)}
        onBack={() => setViewSongID(null)}
        onCreateInstrument={onCreateInstrument}
        onDeleteMaterial={onDeleteMaterial}
        onSaveMaterial={onSaveMaterial}
        onToggleArchive={() => onSaveSong({ ...viewSong, archived: !viewSong.archived, updated_at: stamp() })}
        onTogglePin={() => onSaveSong({ ...viewSong, favorite: !viewSong.favorite, updated_at: stamp() })}
        song={viewSong}
        user={user}
      />
    )
  }

  function renderPanel() {
    if (panel.mode === 'create') {
      return <CreateSongPanel importTitle={panel.importTitle} onCancel={closePanel} onContinue={continueCreate} phase={panel.phase} />
    }
    if (panel.mode === 'info') {
      const song = songs.find((item) => item.id === panel.songID)
      if (!song) {
        return null
      }
      return (
        <SongInfoPanel
          canManage={isManager}
          onClose={closePanel}
          onSave={onSaveSong}
          onTogglePin={() => onSaveSong({ ...song, favorite: !song.favorite, updated_at: stamp() })}
          song={song}
        />
      )
    }
    if (panel.mode === 'confirm-delete') {
      const song = songs.find((item) => item.id === panel.songID)
      return (
        <ConfirmPanel
          confirmLabel="Excluir"
          message={`Excluir a música "${song?.title ?? ''}" e todos os seus materiais?`}
          onCancel={closePanel}
          onConfirm={() => { onDeleteSong(panel.songID); if (viewSongID === panel.songID) setViewSongID(null); closePanel() }}
          title="Excluir música"
        />
      )
    }
    if (panel.mode === 'confirm-delete-many') {
      return (
        <ConfirmPanel
          confirmLabel={`Excluir ${checkedIDs.length}`}
          message={`Excluir ${checkedIDs.length} música(s) selecionada(s) e todos os seus materiais?`}
          onCancel={closePanel}
          onConfirm={() => { checkedIDs.forEach((id) => onDeleteSong(id)); setCheckedIDs([]); setSelectMode(false); closePanel() }}
          title="Excluir músicas"
        />
      )
    }
    if (panel.mode === 'pick-repertoire') {
      return <PickRepertoirePanel count={checkedIDs.length} onCancel={closePanel} onPick={addSelectedToRepertoire} repertoires={repertoires.filter((repertoire) => repertoire.choir_id === choirID)} />
    }
    return null
  }

  return (
    <>
      <SongLibraryList
        canManage={isManager}
        checkedIDs={checkedIDs}
        detailSongID={panel.mode === 'info' ? panel.songID : null}
        getMaterialsCount={materialsCount}
        header={header}
        onQueryChange={setQuery}
        query={query}
        rowHandlers={{
          onOpenSong: (id) => setViewSongID(id),
          onToggleCheck: (id) => setCheckedIDs((current) => toggleInArray(current, id)),
          onToggleDetails: toggleDetails,
          onToggleArchive: (song) => onSaveSong({ ...song, archived: !song.archived, updated_at: stamp() }),
          onRequestDelete: (id) => setPanel({ mode: 'confirm-delete', songID: id }),
          onTogglePin: (song) => onSaveSong({ ...song, favorite: !song.favorite, updated_at: stamp() }),
        }}
        songs={visibleSongs}
        totalCount={songs.length}
      />
      {railEl ? createPortal(renderPanel(), railEl) : null}
    </>
  )
}
