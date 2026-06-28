import type { VoiceType } from '../types'

export function formString(form: FormData, name: string): string {
  return String(form.get(name) ?? '').trim()
}

export function optionalText(value: string): string | undefined {
  return value === '' ? undefined : value
}

export function optionalVoiceType(value: string): VoiceType | undefined {
  if (value === 'soprano' || value === 'contralto' || value === 'tenor' || value === 'baixo') {
    return value
  }
  return undefined
}
