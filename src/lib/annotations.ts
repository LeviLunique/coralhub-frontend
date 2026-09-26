export const ANNOTATION_COLORS = [
  '#000000', '#3d3d3d', '#969696', '#dedede', '#ffffff',
  '#ec4a14', '#986487', '#ffad19', '#afd426', '#4aadd8',
  '#a52f05', '#402432', '#955000', '#496000', '#075e7f',
] as const

export const MUSIC_SYMBOLS = [
  '♭', '♯', '♮', '𝄫', '𝄪',
  '♩', '‡', '8va', '8vb', '∞',
  'ppp', 'pp', 'p', 'mp', 'mf',
  'f', 'ff', 'fff', 'sfz', 'fp',
  '⌜', '∨', '⌟', '∧', '>',
  '–', '⌃', '⌄', "'", '˙',
  '°', '♭', '+', 'V', ',',
  '//', '0', '1', '2', '3',
  '4', '5', 'p', 'i', 'm',
  'a', 'c', '♪', '𝅘𝅥', '♫',
  '𝅘𝅥𝅯', 'tr', '〰', '≈', '≋',
  '𝄀', '𝄁', '𝄂', '𝄃', '𝄆',
  '𝄇', '%', '‰', '§', '⊕',
  'D.S.', 'D.C.', '𝄐', '𝄑', '𝄒',
  '𝅗𝅥', '𝅘𝅥', '♩', '♪', '♫',
  '𝄽', '𝄾', '𝄿', '𝅀', '𝅁',
  '𝄞', '𝄢', '𝄡', '𝄓', 'TAB',
  'C', '¢', '⓪', '①', '②',
  '③', '④', '⑤', '⑥', '⑦',
  '⑧', '⑨', '▦', '╱', '／',
  '▱', '▰', '◇', 'ˏ',
] as const

export type AnnotationPoint = { x: number; y: number }

export type AnnotationElement = {
  id: string
  kind: 'symbol' | 'text' | 'path'
  x: number
  y: number
  color: string
  size: number
  opacity: number
  value?: string
  points?: AnnotationPoint[]
}

export type AnnotationLayer = {
  id: string
  name: string
  visible: boolean
  elements: AnnotationElement[]
}

export type PencilPreset = {
  id: string
  name: string
  color: string
  opacity: number
  size: number
}

export function createAnnotationID(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createAnnotationLayer(index = 1): AnnotationLayer {
  return {
    id: createAnnotationID('layer'),
    name: index === 1 ? 'Minhas anotações' : `Camada ${index}`,
    visible: true,
    elements: [],
  }
}

export function createPencilPreset(index = 1, source?: PencilPreset): PencilPreset {
  return {
    id: createAnnotationID('pencil'),
    name: `Lápis ${index}`,
    color: source?.color ?? ANNOTATION_COLORS[0],
    opacity: source?.opacity ?? 1,
    size: source?.size ?? 2,
  }
}

export function annotationPath(points: AnnotationPoint[]) {
  if (points.length === 0) return ''
  return points.reduce((path, point, index) => `${path}${index === 0 ? 'M' : ' L'} ${point.x} ${point.y}`, '')
}
