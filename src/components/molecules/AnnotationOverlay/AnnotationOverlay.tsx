import type { PointerEvent as ReactPointerEvent } from 'react'
import { annotationPath } from '../../../lib/annotations'
import type { AnnotationElement, AnnotationLayer } from '../../../lib/annotations'
import styles from './AnnotationOverlay.module.css'

type AnnotationOverlayProps = {
  layers: AnnotationLayer[]
  allVisible?: boolean
  interactive?: boolean
  selectedID?: string | null
  onSelect?: (elementID: string, event: ReactPointerEvent<HTMLElement | SVGPathElement>) => void
}

export function AnnotationOverlay({ layers, allVisible = true, interactive = false, selectedID, onSelect }: AnnotationOverlayProps) {
  if (!allVisible) return null
  return (
    <div aria-label="Anotações da partitura" className={`${styles.overlay} ${interactive ? styles.interactive : ''}`}>
      {layers.filter((layer) => layer.visible).flatMap((layer) => layer.elements.map((element) => (
        <AnnotationItem
          element={element}
          interactive={interactive}
          key={element.id}
          onSelect={onSelect}
          selected={selectedID === element.id}
        />
      )))}
    </div>
  )
}

function AnnotationItem({ element, interactive, selected, onSelect }: {
  element: AnnotationElement
  interactive: boolean
  selected: boolean
  onSelect?: AnnotationOverlayProps['onSelect']
}) {
  const commonStyle = {
    color: element.color,
    fontSize: `${element.size}px`,
    left: `${element.x}%`,
    opacity: element.opacity,
    top: `${element.y}%`,
  }
  if (element.kind === 'path') {
    return (
      <svg className={`${styles.pathLayer} ${selected ? styles.selected : ''}`} viewBox="0 0 100 100">
        <path
          d={annotationPath(element.points ?? [])}
          fill="none"
          onPointerDown={interactive ? (event) => onSelect?.(element.id, event) : undefined}
          stroke={element.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={element.opacity}
          strokeWidth={element.size}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    )
  }
  return (
    <span
      className={`${styles.item} ${element.kind === 'symbol' ? styles.symbol : styles.text} ${selected ? styles.selected : ''}`}
      onPointerDown={interactive ? (event) => onSelect?.(element.id, event) : undefined}
      style={commonStyle}
    >
      {element.value}
    </span>
  )
}
