import type { Instrument, Material, MaterialType, User, VoiceType } from '../types'
import { formatBytes } from '../utils/format'
import { voiceLabelDisplay } from './voice'

export const materialTypeLabels: Record<MaterialType, string> = {
  audio_guide: 'Áudio-guia',
  sheet_music: 'Partitura',
  playback: 'Playback',
  lyrics: 'Letra',
  other: 'Outro',
}

export const materialTypeOrder: MaterialType[] = ['audio_guide', 'sheet_music', 'playback', 'lyrics', 'other']

// The three panel sections a material can belong to.
export type MaterialSection = 'scores' | 'media' | 'notes'

// Synthetic id for the song-level notes "document" shown in the viewer.
export const NOTES_DOC_ID = 'song-notes'

export function sectionOf(material: Material): MaterialSection {
  if (material.material_type === 'sheet_music') {
    return 'scores'
  }
  if (material.material_type === 'audio_guide' || material.material_type === 'playback') {
    return 'media'
  }
  return 'notes'
}

export function isAudioMaterial(material: Material): boolean {
  if (material.content_type) {
    return material.content_type.startsWith('audio')
  }
  return material.material_type === 'audio_guide' || material.material_type === 'playback'
}

export function materialMeta(material: Material): string {
  const parts: string[] = [materialTypeLabels[material.material_type]]
  if (material.size_bytes) {
    parts.push(formatBytes(material.size_bytes))
  }
  return parts.join(' · ')
}

export function materialDestinoLabel(material: Material, instruments: Instrument[]): string {
  if (material.target_type === 'voice') {
    return material.voice_labels.length ? material.voice_labels.map(voiceLabelDisplay).join(', ') : 'Todos os naipes'
  }
  if (!material.instrument_ids.length) {
    return 'Todos os instrumentos'
  }
  const names = material.instrument_ids.map((id) => instruments.find((instrument) => instrument.id === id)?.name).filter((name): name is string => Boolean(name))
  return names.length ? names.join(', ') : 'Instrumento'
}

export function resolveUserInstrumentIDs(user: User, instruments: Instrument[]): string[] {
  const names = new Set(user.instruments ?? [])
  return instruments.filter((instrument) => names.has(instrument.name)).map((instrument) => instrument.id)
}

export function materialMatchesVoice(material: Material, voiceType: VoiceType): boolean {
  if (material.target_type !== 'voice') {
    return false
  }
  return material.voice_labels.length === 0 || material.voice_labels.some((label) => label.toLowerCase().includes(voiceType))
}

export function materialMatchesInstruments(material: Material, instrumentIDs: string[]): boolean {
  if (material.target_type !== 'instrument') {
    return false
  }
  return material.instrument_ids.length === 0 || material.instrument_ids.some((id) => instrumentIDs.includes(id))
}

// Default audience for a member, before any explicit filter is applied.
export function materialMatchesRoleDefault(material: Material, user: User, instruments: Instrument[]): boolean {
  if (user.manager || user.access_role === 'conductor') {
    return true
  }
  if (user.access_role === 'instrumentalist') {
    return materialMatchesInstruments(material, resolveUserInstrumentIDs(user, instruments))
  }
  return Boolean(user.voice_type) && materialMatchesVoice(material, user.voice_type as VoiceType)
}
