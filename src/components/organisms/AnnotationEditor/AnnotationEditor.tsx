import { useMemo, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ArrowLeft, ArrowRight, Copy, Eye, EyeOff, Layers3, MousePointer2, Pencil, Plus, Redo2, Trash2, Type, Undo2 } from 'lucide-react'
import type { Instrument, Material, Song } from '../../../types'
import { Button } from '../../../design-system/components'
import {
  ANNOTATION_COLORS,
  MUSIC_SYMBOLS,
  createAnnotationID,
  createAnnotationLayer,
  createPencilPreset,
} from '../../../lib/annotations'
import type { AnnotationElement, AnnotationLayer, AnnotationPoint, PencilPreset } from '../../../lib/annotations'
import { materialDestinoLabel } from '../../../lib/materials'
import { AnnotationOverlay } from '../../molecules/AnnotationOverlay'
import styles from './AnnotationEditor.module.css'

type AnnotationTool = 'select' | 'symbol' | 'text' | 'pencil' | 'layers'

type AnnotationEditorProps = {
  initialLayers: AnnotationLayer[]
  instruments: Instrument[]
  material: Material
  song: Song
  onCancel: () => void
  onSave: (layers: AnnotationLayer[]) => void
}

export function AnnotationEditor({ initialLayers, instruments, material, song, onCancel, onSave }: AnnotationEditorProps) {
  const firstLayers = initialLayers.length > 0 ? structuredClone(initialLayers) : [createAnnotationLayer()]
  const [layers, setLayers] = useState<AnnotationLayer[]>(firstLayers)
  const [history, setHistory] = useState<AnnotationLayer[][]>([])
  const [future, setFuture] = useState<AnnotationLayer[][]>([])
  const [tool, setTool] = useState<AnnotationTool>('symbol')
  const [activeLayerID, setActiveLayerID] = useState(firstLayers[0].id)
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const [symbol, setSymbol] = useState<string>(MUSIC_SYMBOLS[0])
  const [symbolColor, setSymbolColor] = useState<string>(ANNOTATION_COLORS[0])
  const [symbolSize, setSymbolSize] = useState(32)
  const [textColor, setTextColor] = useState<string>(ANNOTATION_COLORS[0])
  const [textSize, setTextSize] = useState(18)
  const [textValue, setTextValue] = useState('Texto')
  const firstPencil = createPencilPreset()
  const [pencils, setPencils] = useState<PencilPreset[]>([firstPencil])
  const [activePencilID, setActivePencilID] = useState(firstPencil.id)
  const [drawing, setDrawing] = useState<AnnotationPoint[] | null>(null)

  const activePencil = pencils.find((item) => item.id === activePencilID) ?? pencils[0]
  const selectedElement = useMemo(
    () => layers.flatMap((layer) => layer.elements).find((element) => element.id === selectedID) ?? null,
    [layers, selectedID],
  )

  function commit(next: AnnotationLayer[]) {
    setHistory((current) => [...current.slice(-39), structuredClone(layers)])
    setFuture([])
    setLayers(next)
  }

  function undo() {
    const previous = history.at(-1)
    if (!previous) return
    setFuture((current) => [structuredClone(layers), ...current].slice(0, 40))
    setLayers(previous)
    setHistory((current) => current.slice(0, -1))
    setSelectedID(null)
  }

  function redo() {
    const next = future[0]
    if (!next) return
    setHistory((current) => [...current, structuredClone(layers)].slice(-40))
    setLayers(next)
    setFuture((current) => current.slice(1))
    setSelectedID(null)
  }

  function pointFromEvent(event: ReactPointerEvent<HTMLDivElement>): AnnotationPoint {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
    }
  }

  function addElement(element: AnnotationElement) {
    commit(layers.map((layer) => layer.id === activeLayerID ? { ...layer, visible: true, elements: [...layer.elements, element] } : layer))
    setSelectedID(element.id)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const point = pointFromEvent(event)
    if (tool === 'symbol') {
      addElement({ id: createAnnotationID('symbol'), kind: 'symbol', ...point, color: symbolColor, size: symbolSize, opacity: 1, value: symbol })
    } else if (tool === 'text') {
      addElement({ id: createAnnotationID('text'), kind: 'text', ...point, color: textColor, size: textSize, opacity: 1, value: textValue.trim() || 'Texto' })
    } else if (tool === 'pencil') {
      event.currentTarget.setPointerCapture(event.pointerId)
      setDrawing([point])
      setSelectedID(null)
    } else if (tool === 'select') {
      setSelectedID(null)
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drawing || tool !== 'pencil') return
    const nextPoint = pointFromEvent(event)
    const last = drawing.at(-1)
    if (last && Math.hypot(last.x - nextPoint.x, last.y - nextPoint.y) < .25) return
    setDrawing((current) => current ? [...current, nextPoint] : current)
  }

  function finishDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drawing || !activePencil) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const first = drawing[0]
    const path: AnnotationElement = {
      id: createAnnotationID('path'),
      kind: 'path',
      x: first.x,
      y: first.y,
      color: activePencil.color,
      size: activePencil.size,
      opacity: activePencil.opacity,
      points: drawing,
    }
    setDrawing(null)
    if (drawing.length > 1) addElement(path)
  }

  function removeSelected() {
    if (!selectedID) return
    commit(layers.map((layer) => ({ ...layer, elements: layer.elements.filter((element) => element.id !== selectedID) })))
    setSelectedID(null)
  }

  function duplicateSelected() {
    if (!selectedElement) return
    const copy: AnnotationElement = { ...structuredClone(selectedElement), id: createAnnotationID(selectedElement.kind), x: Math.min(98, selectedElement.x + 3), y: Math.min(98, selectedElement.y + 3) }
    addElement(copy)
  }

  function updateSelected(patch: Partial<AnnotationElement>) {
    if (!selectedID) return
    commit(layers.map((layer) => ({ ...layer, elements: layer.elements.map((element) => element.id === selectedID ? { ...element, ...patch } : element) })))
  }

  function addLayer() {
    const layer = createAnnotationLayer(layers.length + 1)
    commit([...layers, layer])
    setActiveLayerID(layer.id)
  }

  function toggleLayer(layerID: string) {
    commit(layers.map((layer) => layer.id === layerID ? { ...layer, visible: !layer.visible } : layer))
  }

  function toggleAllLayers() {
    const nextVisible = !layers.every((layer) => layer.visible)
    commit(layers.map((layer) => ({ ...layer, visible: nextVisible })))
  }

  function removeLayer(layerID: string) {
    if (layers.length === 1) return
    const next = layers.filter((layer) => layer.id !== layerID)
    commit(next)
    if (activeLayerID === layerID) setActiveLayerID(next[0].id)
  }

  function moveActiveLayer(direction: -1 | 1) {
    const current = layers.findIndex((layer) => layer.id === activeLayerID)
    const next = Math.max(0, Math.min(layers.length - 1, current + direction))
    setActiveLayerID(layers[next].id)
  }

  function updatePencil(patch: Partial<PencilPreset>) {
    setPencils((current) => current.map((item) => item.id === activePencilID ? { ...item, ...patch } : item))
  }

  function addPencil(source?: PencilPreset) {
    const pencil = createPencilPreset(pencils.length + 1, source)
    setPencils((current) => [...current, pencil])
    setActivePencilID(pencil.id)
  }

  const liveLayers = drawing && activePencil ? [{
    id: 'live-layer',
    name: 'Traço atual',
    visible: true,
    elements: [{ id: 'live-path', kind: 'path' as const, x: drawing[0].x, y: drawing[0].y, color: activePencil.color, size: activePencil.size, opacity: activePencil.opacity, points: drawing }],
  }] : []

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <div className={styles.layerIdentity}><Layers3 size={20} /><strong>{layers.find((layer) => layer.id === activeLayerID)?.name}</strong></div>
        <div className={styles.historyControls}>
          <button aria-label="Camada anterior" disabled={layers.findIndex((layer) => layer.id === activeLayerID) === 0} onClick={() => moveActiveLayer(-1)} type="button"><ArrowLeft size={19} /></button>
          <button aria-label="Próxima camada" disabled={layers.findIndex((layer) => layer.id === activeLayerID) === layers.length - 1} onClick={() => moveActiveLayer(1)} type="button"><ArrowRight size={19} /></button>
          <button aria-label="Desfazer" disabled={history.length === 0} onClick={undo} type="button"><Undo2 size={20} /></button>
          <button aria-label="Refazer" disabled={future.length === 0} onClick={redo} type="button"><Redo2 size={20} /></button>
        </div>
        <div className={styles.doneActions}>
          <Button onClick={onCancel} variant="quiet">Cancelar</Button>
          <Button onClick={() => onSave(layers)} variant="primary">Concluir</Button>
        </div>
      </header>

      <div className={styles.workspace}>
        <main className={styles.canvas}>
          <div className={styles.page}>
            <ScorePreview instruments={instruments} material={material} song={song} />
            <div
              aria-label="Área de anotação"
              className={`${styles.annotationSurface} ${styles[`tool${tool[0].toUpperCase()}${tool.slice(1)}`]}`}
              onPointerCancel={finishDrawing}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrawing}
            >
              <AnnotationOverlay
                interactive={tool === 'select'}
                layers={[...layers, ...liveLayers]}
                onSelect={(elementID, event) => { event.stopPropagation(); setSelectedID(elementID) }}
                selectedID={selectedID}
              />
            </div>
          </div>
        </main>

        <aside className={styles.tools}>
          <nav aria-label="Ferramentas de anotação" className={styles.toolTabs}>
            <ToolButton active={tool === 'select'} label="Seleção" onClick={() => setTool('select')}><MousePointer2 /></ToolButton>
            <ToolButton active={tool === 'symbol'} label="Símbolos" onClick={() => setTool('symbol')}><span className={styles.flatIcon}>♯♭</span></ToolButton>
            <ToolButton active={tool === 'text'} label="Texto" onClick={() => setTool('text')}><Type /></ToolButton>
            <ToolButton active={tool === 'pencil'} label="Lápis" onClick={() => setTool('pencil')}><Pencil /></ToolButton>
            <ToolButton active={tool === 'layers'} label="Camadas" onClick={() => setTool('layers')}><Layers3 /></ToolButton>
          </nav>
          <div className={styles.inspector}>
            {tool === 'symbol' ? <SymbolPanel color={symbolColor} onColor={setSymbolColor} onSize={setSymbolSize} onSymbol={setSymbol} size={symbolSize} symbol={symbol} /> : null}
            {tool === 'text' ? <TextPanel color={textColor} onColor={setTextColor} onSize={setTextSize} onValue={setTextValue} size={textSize} value={textValue} /> : null}
            {tool === 'pencil' && activePencil ? <PencilPanel activeID={activePencilID} onAdd={() => addPencil()} onDuplicate={() => addPencil(activePencil)} onSelect={setActivePencilID} onUpdate={updatePencil} pencils={pencils} preset={activePencil} /> : null}
            {tool === 'layers' ? <LayersPanel activeID={activeLayerID} layers={layers} onAdd={addLayer} onRemove={removeLayer} onSelect={setActiveLayerID} onToggle={toggleLayer} onToggleAll={toggleAllLayers} /> : null}
            {tool === 'select' ? <SelectionPanel element={selectedElement} onDelete={removeSelected} onDuplicate={duplicateSelected} onUpdate={updateSelected} /> : null}
          </div>
        </aside>
      </div>
    </div>
  )
}

function ToolButton({ active, children, label, onClick }: { active: boolean; children: React.ReactNode; label: string; onClick: () => void }) {
  return <button aria-label={label} aria-pressed={active} className={active ? styles.toolActive : ''} onClick={onClick} title={label} type="button">{children}</button>
}

function Palette({ color, onChange }: { color: string; onChange: (value: string) => void }) {
  return (
    <div aria-label="Cores" className={styles.palette} role="group">
      {ANNOTATION_COLORS.map((value) => (
        <button aria-label={`Cor ${value}`} aria-pressed={color === value} key={value} onClick={() => onChange(value)} style={{ backgroundColor: value }} type="button" />
      ))}
    </div>
  )
}

function RangeControl({ label, max, min, onChange, suffix, value }: { label: string; max: number; min: number; onChange: (value: number) => void; suffix: string; value: number }) {
  return (
    <label className={styles.rangeControl}>
      <span>{label} <strong>{value}{suffix}</strong></span>
      <input aria-label={label} max={max} min={min} onChange={(event) => onChange(Number(event.currentTarget.value))} type="range" value={value} />
    </label>
  )
}

function SymbolPanel({ color, onColor, onSize, onSymbol, size, symbol }: { color: string; onColor: (color: string) => void; onSize: (size: number) => void; onSymbol: (symbol: string) => void; size: number; symbol: string }) {
  return (
    <section>
      <h2>Símbolos</h2>
      <InspectorTitle>Cor</InspectorTitle>
      <Palette color={color} onChange={onColor} />
      <RangeControl label="Tamanho" max={72} min={12} onChange={onSize} suffix="pt" value={size} />
      <InspectorTitle>Todos</InspectorTitle>
      <div className={styles.symbolGrid}>
        {MUSIC_SYMBOLS.map((value, index) => <button aria-label={`Símbolo ${value}`} aria-pressed={symbol === value} className={symbol === value ? styles.symbolActive : ''} key={`${value}-${index}`} onClick={() => onSymbol(value)} type="button">{value}</button>)}
      </div>
    </section>
  )
}

function TextPanel({ color, onColor, onSize, onValue, size, value }: { color: string; onColor: (color: string) => void; onSize: (size: number) => void; onValue: (value: string) => void; size: number; value: string }) {
  return (
    <section>
      <h2>Texto</h2>
      <label className={styles.textInput}><span>Texto a inserir</span><textarea onChange={(event) => onValue(event.currentTarget.value)} value={value} /></label>
      <InspectorTitle>Cor</InspectorTitle>
      <Palette color={color} onChange={onColor} />
      <RangeControl label="Tamanho" max={72} min={10} onChange={onSize} suffix="pt" value={size} />
      <p className={styles.help}>Clique na partitura para inserir o texto.</p>
    </section>
  )
}

function PencilPanel({ activeID, onAdd, onDuplicate, onSelect, onUpdate, pencils, preset }: { activeID: string; onAdd: () => void; onDuplicate: () => void; onSelect: (id: string) => void; onUpdate: (patch: Partial<PencilPreset>) => void; pencils: PencilPreset[]; preset: PencilPreset }) {
  return (
    <section>
      <h2>Lápis</h2>
      <button className={styles.addAction} onClick={onAdd} type="button"><Plus size={18} /> Adicionar lápis</button>
      <div className={styles.pencilList}>{pencils.map((item) => <button className={activeID === item.id ? styles.rowActive : ''} key={item.id} onClick={() => onSelect(item.id)} type="button"><span style={{ background: item.color }} />{item.name}<small>{Math.round(item.opacity * 100)}% · {item.size}pt</small></button>)}</div>
      <div className={styles.pencilSettings}>
        <InspectorTitle>Cor</InspectorTitle>
        <Palette color={preset.color} onChange={(color) => onUpdate({ color })} />
        <RangeControl label="Opacidade" max={100} min={5} onChange={(opacity) => onUpdate({ opacity: opacity / 100 })} suffix="%" value={Math.round(preset.opacity * 100)} />
        <RangeControl label="Tamanho" max={16} min={1} onChange={(size) => onUpdate({ size })} suffix="pt" value={preset.size} />
        <button className={styles.duplicateAction} onClick={onDuplicate} type="button"><Copy size={17} /> Duplicar</button>
      </div>
    </section>
  )
}

function LayersPanel({ activeID, layers, onAdd, onRemove, onSelect, onToggle, onToggleAll }: { activeID: string; layers: AnnotationLayer[]; onAdd: () => void; onRemove: (id: string) => void; onSelect: (id: string) => void; onToggle: (id: string) => void; onToggleAll: () => void }) {
  const allVisible = layers.every((layer) => layer.visible)
  return (
    <section>
      <div className={styles.headingRow}><h2>Camadas <span>{layers.length}</span></h2><button onClick={onToggleAll} type="button">{allVisible ? 'Ocultar todas' : 'Exibir todas'}</button></div>
      <InspectorTitle>Minhas camadas</InspectorTitle>
      <button className={styles.addAction} onClick={onAdd} type="button"><Plus size={18} /> Adicionar camada</button>
      <div className={styles.layerList}>{layers.map((layer) => (
        <div className={activeID === layer.id ? styles.rowActive : ''} key={layer.id}>
          <button className={styles.layerName} onClick={() => onSelect(layer.id)} type="button"><Layers3 size={17} />{layer.name}</button>
          <button aria-label={layer.visible ? `Ocultar ${layer.name}` : `Exibir ${layer.name}`} onClick={() => onToggle(layer.id)} type="button">{layer.visible ? <Eye size={17} /> : <EyeOff size={17} />}</button>
          <button aria-label={`Excluir ${layer.name}`} disabled={layers.length === 1} onClick={() => onRemove(layer.id)} type="button"><Trash2 size={16} /></button>
        </div>
      ))}</div>
    </section>
  )
}

function SelectionPanel({ element, onDelete, onDuplicate, onUpdate }: { element: AnnotationElement | null; onDelete: () => void; onDuplicate: () => void; onUpdate: (patch: Partial<AnnotationElement>) => void }) {
  return (
    <section>
      <h2>Seleção</h2>
      {!element ? <p className={styles.help}>Clique em um elemento para selecioná-lo.</p> : (
        <div className={styles.selectionSettings}>
          <strong>{element.kind === 'path' ? 'Traço de lápis' : element.kind === 'symbol' ? 'Símbolo' : 'Texto'}</strong>
          <InspectorTitle>Cor</InspectorTitle>
          <Palette color={element.color} onChange={(color) => onUpdate({ color })} />
          <RangeControl label="Tamanho" max={element.kind === 'path' ? 16 : 72} min={1} onChange={(size) => onUpdate({ size })} suffix="pt" value={element.size} />
          <div className={styles.selectionActions}><button onClick={onDuplicate} type="button"><Copy size={17} /> Duplicar</button><button className={styles.danger} onClick={onDelete} type="button"><Trash2 size={17} /> Excluir</button></div>
        </div>
      )}
    </section>
  )
}

function InspectorTitle({ children }: { children: React.ReactNode }) {
  return <div className={styles.inspectorTitle}><span>{children}</span><i /></div>
}

function ScorePreview({ material, instruments, song }: { material: Material; instruments: Instrument[]; song: Song }) {
  return (
    <div className={styles.scorePreview}>
      <div className={styles.scoreHead}><strong>{song.title}</strong><span>{material.name} · {materialDestinoLabel(material, instruments)}</span></div>
      <svg aria-hidden="true" className={styles.scoreSvg} preserveAspectRatio="xMidYMin meet" viewBox="0 0 520 640">
        {Array.from({ length: 9 }).map((_, system) => {
          const top = 24 + system * 68
          return <g key={system}>{Array.from({ length: 5 }).map((__, line) => <line key={line} stroke="currentColor" strokeWidth="1" x1="8" x2="512" y1={top + line * 9} y2={top + line * 9} />)}<path d={`M14 ${top - 6} q10 4 0 20 q-10 8 0 22`} fill="none" stroke="currentColor" strokeWidth="2" /></g>
        })}
      </svg>
      <span className={styles.scoreFooter}>Pré-visualização ilustrativa · o PDF da partitura será exibido aqui.</span>
    </div>
  )
}
