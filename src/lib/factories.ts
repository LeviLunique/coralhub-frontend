import type { Material, Song } from '../types'
import { newID } from './ids'

export function blankSong(tenantID: string, choirID: string): Song {
  const now = new Date().toISOString()
  return {
    id: newID('song'),
    tenant_id: tenantID,
    choir_id: choirID,
    title: '',
    composer: '',
    arranger: '',
    song_key: '',
    duration: '',
    notes: '',
    favorite: false,
    archived: false,
    created_at: now,
    updated_at: now,
  }
}

export function blankMaterial(tenantID: string, choirID: string, songID: string): Material {
  return {
    id: newID('material'),
    tenant_id: tenantID,
    choir_id: choirID,
    song_id: songID,
    name: '',
    material_type: 'sheet_music',
    target_type: 'voice',
    voice_labels: [],
    instrument_ids: [],
    archived: false,
    updated_at: new Date().toISOString(),
  }
}
