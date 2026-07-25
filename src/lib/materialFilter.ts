import type { Material } from '../types'

export type FilterMode = 'all' | 'voice' | 'instrument'
export type FilterState = { mode: FilterMode; voices: string[]; instruments: string[] }

export const emptyFilter: FilterState = { mode: 'all', voices: [], instruments: [] }

// Filter a list of materials by target audience (all / voice types / instruments).
export function applyFilter(list: Material[], filter: FilterState): Material[] {
  if (filter.mode === 'all') {
    return list
  }
  if (filter.mode === 'voice') {
    return list.filter(
      (material) =>
        material.target_type === 'voice' &&
        (filter.voices.length === 0 || material.voice_labels.length === 0 || material.voice_labels.some((label) => filter.voices.includes(label))),
    )
  }
  return list.filter(
    (material) =>
      material.target_type === 'instrument' &&
      (filter.instruments.length === 0 || material.instrument_ids.length === 0 || material.instrument_ids.some((id) => filter.instruments.includes(id))),
  )
}

// Distinct voice labels present among the voice-targeted materials.
export function voiceOptionsOf(materials: Material[]): string[] {
  return Array.from(new Set(materials.filter((material) => material.target_type === 'voice').flatMap((material) => material.voice_labels)))
}

// Distinct instrument ids present among the instrument-targeted materials.
export function instrumentOptionsOf(materials: Material[]): string[] {
  return Array.from(new Set(materials.filter((material) => material.target_type === 'instrument').flatMap((material) => material.instrument_ids)))
}
