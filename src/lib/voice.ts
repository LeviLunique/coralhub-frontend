import type { VoiceType } from '../types'

export const voiceLabels: Record<VoiceType, string> = {
  soprano: 'Soprano',
  contralto: 'Contralto',
  tenor: 'Tenor',
  baixo: 'Baixo',
}

export const voiceOrder: VoiceType[] = ['soprano', 'contralto', 'tenor', 'baixo']

export function voiceLabelDisplay(label: string): string {
  return (voiceLabels as Record<string, string>)[label.toLowerCase()] ?? label
}

export function isStandardVoice(label: string): boolean {
  return voiceOrder.includes(label.toLowerCase() as VoiceType)
}
