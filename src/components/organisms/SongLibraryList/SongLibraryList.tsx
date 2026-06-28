import type { ComponentProps } from 'react'
import { Star } from 'lucide-react'
import type { Song } from '../../../types'
import { EmptyArt } from '../../atoms/EmptyArt'
import { SearchInput } from '../../atoms/SearchInput'
import { SongLibraryHeader } from '../../molecules/SongLibraryHeader'
import { SongRow } from '../../molecules/SongRow'
import styles from './SongLibraryList.module.css'

type RowHandlers = {
  onOpenSong: (songID: string) => void
  onToggleCheck: (songID: string) => void
  onToggleDetails: (songID: string) => void
  onToggleArchive: (song: Song) => void
  onRequestDelete: (songID: string) => void
  onTogglePin: (song: Song) => void
}

type SongLibraryListProps = {
  songs: Song[]
  totalCount: number
  getMaterialsCount: (songID: string) => number
  query: string
  onQueryChange: (value: string) => void
  canManage: boolean
  detailSongID: string | null
  checkedIDs: string[]
  rowHandlers: RowHandlers
  header: ComponentProps<typeof SongLibraryHeader>
}

export function SongLibraryList({ songs, totalCount, getMaterialsCount, query, onQueryChange, canManage, detailSongID, checkedIDs, rowHandlers, header }: SongLibraryListProps) {
  const favorites = songs.filter((song) => song.favorite)
  const others = songs.filter((song) => !song.favorite)

  function renderRow(song: Song) {
    return (
      <SongRow
        canManage={canManage}
        checked={checkedIDs.includes(song.id)}
        detailOpen={detailSongID === song.id}
        key={song.id}
        materialsCount={getMaterialsCount(song.id)}
        onOpen={() => rowHandlers.onOpenSong(song.id)}
        onRequestDelete={() => rowHandlers.onRequestDelete(song.id)}
        onToggleArchive={() => rowHandlers.onToggleArchive(song)}
        onToggleCheck={() => rowHandlers.onToggleCheck(song.id)}
        onToggleDetails={() => rowHandlers.onToggleDetails(song.id)}
        onTogglePin={() => rowHandlers.onTogglePin(song)}
        selectMode={header.selectMode}
        song={song}
      />
    )
  }

  return (
    <div className={styles.library}>
      <SongLibraryHeader {...header} />
      <SearchInput onChange={onQueryChange} placeholder="Pesquisar música ou compositor" value={query} />

      {songs.length === 0 ? (
        totalCount === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>Este é o lugar de todas as suas músicas.<br />Uma música pode conter várias partes e materiais.</p>
            <EmptyArt />
          </div>
        ) : (
          <p className={styles.muted}>Nenhuma música corresponde à sua busca.</p>
        )
      ) : (
        <div className={styles.sections}>
          {favorites.length > 0 ? (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}><Star size={14} /> Favoritos</h3>
              <div className={styles.list}>{favorites.map(renderRow)}</div>
            </div>
          ) : null}
          <div className={styles.list}>{others.map(renderRow)}</div>
        </div>
      )}
    </div>
  )
}
