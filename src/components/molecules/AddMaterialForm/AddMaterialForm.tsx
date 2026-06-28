import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Instrument, MaterialType } from '../../../types'
import { Button, Field, SelectField } from '../../../design-system/components'
import { toggleInArray } from '../../../lib/collections'
import { materialTypeLabels, materialTypeOrder } from '../../../lib/materials'
import { voiceLabelDisplay, voiceOrder } from '../../../lib/voice'
import styles from './AddMaterialForm.module.css'

export type NewMaterialDraft = {
  name: string
  material_type: MaterialType
  target_type: 'voice' | 'instrument'
  voice_labels: string[]
  instrument_ids: string[]
}

type AddMaterialFormProps = {
  instruments: Instrument[]
  onCreateInstrument: (name: string) => Instrument
  onAdd: (draft: NewMaterialDraft) => void
}

export function AddMaterialForm({ instruments, onCreateInstrument, onAdd }: AddMaterialFormProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<MaterialType>('sheet_music')
  const [target, setTarget] = useState<'voice' | 'instrument'>('voice')
  const [voiceLabels, setVoiceLabels] = useState<string[]>([])
  const [customVoices, setCustomVoices] = useState<string[]>([])
  const [customVoiceInput, setCustomVoiceInput] = useState('')
  const [instrumentIDs, setInstrumentIDs] = useState<string[]>([])
  const [newInstrumentInput, setNewInstrumentInput] = useState('')

  const voiceChoices = [...voiceOrder.map((voice) => voice as string), ...customVoices]
  const availableInstruments = instruments.filter((instrument) => !instrument.archived || instrumentIDs.includes(instrument.id))

  function addCustomVoice() {
    const label = customVoiceInput.trim()
    if (!label) {
      return
    }
    if (!voiceChoices.some((choice) => choice.toLowerCase() === label.toLowerCase())) {
      setCustomVoices((current) => [...current, label])
    }
    setVoiceLabels((current) => (current.some((value) => value.toLowerCase() === label.toLowerCase()) ? current : [...current, label]))
    setCustomVoiceInput('')
  }

  function createInstrumentInline() {
    const label = newInstrumentInput.trim()
    if (!label) {
      return
    }
    const existing = instruments.find((instrument) => instrument.name.toLowerCase() === label.toLowerCase())
    const instrument = existing ?? onCreateInstrument(label)
    setInstrumentIDs((current) => (current.includes(instrument.id) ? current : [...current, instrument.id]))
    setNewInstrumentInput('')
  }

  function reset() {
    setName('')
    setVoiceLabels([])
    setCustomVoices([])
    setCustomVoiceInput('')
    setInstrumentIDs([])
    setNewInstrumentInput('')
  }

  function submit() {
    if (!name.trim()) {
      return
    }
    onAdd({
      name: name.trim(),
      material_type: type,
      target_type: target,
      voice_labels: target === 'voice' ? voiceLabels : [],
      instrument_ids: target === 'instrument' ? instrumentIDs : [],
    })
    reset()
  }

  return (
    <div className={styles.form}>
      <Field label="Nome do material" onChange={(event) => setName(event.target.value)} placeholder="Áudio-guia soprano" value={name} />
      <div className="form-grid">
        <SelectField label="Tipo" onChange={(event) => setType(event.target.value as MaterialType)} value={type}>
          {materialTypeOrder.map((option) => <option key={option} value={option}>{materialTypeLabels[option]}</option>)}
        </SelectField>
        <SelectField label="Destino" onChange={(event) => setTarget(event.target.value === 'instrument' ? 'instrument' : 'voice')} value={target}>
          <option value="voice">Tipo de voz</option>
          <option value="instrument">Instrumento</option>
        </SelectField>
      </div>

      {target === 'voice' ? (
        <div className={styles.group}>
          <span className="field__label">Tipos de voz</span>
          <div className={styles.chips}>
            <button className={`${styles.chip} ${voiceLabels.length === 0 ? styles.chipActive : ''}`} onClick={() => setVoiceLabels([])} type="button">Todos os naipes</button>
            {voiceChoices.map((choice) => (
              <button className={`${styles.chip} ${voiceLabels.includes(choice) ? styles.chipActive : ''}`} key={choice} onClick={() => setVoiceLabels((current) => toggleInArray(current, choice))} type="button">
                {voiceLabelDisplay(choice)}
              </button>
            ))}
          </div>
          <div className={styles.inline}>
            <input className="input" onChange={(event) => setCustomVoiceInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomVoice() } }} placeholder="Ex.: Soprano 1" value={customVoiceInput} />
            <Button onClick={addCustomVoice} size="sm" variant="quiet">+ Adicionar</Button>
          </div>
        </div>
      ) : (
        <div className={styles.group}>
          <span className="field__label">Instrumentos</span>
          <div className={styles.chips}>
            <button className={`${styles.chip} ${instrumentIDs.length === 0 ? styles.chipActive : ''}`} onClick={() => setInstrumentIDs([])} type="button">Todos</button>
            {availableInstruments.map((instrument) => (
              <button className={`${styles.chip} ${instrumentIDs.includes(instrument.id) ? styles.chipActive : ''}`} key={instrument.id} onClick={() => setInstrumentIDs((current) => toggleInArray(current, instrument.id))} type="button">
                {instrument.name}
              </button>
            ))}
          </div>
          <div className={styles.inline}>
            <input className="input" onChange={(event) => setNewInstrumentInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); createInstrumentInline() } }} placeholder="Novo instrumento" value={newInstrumentInput} />
            <Button onClick={createInstrumentInline} size="sm" variant="quiet">+ Criar</Button>
          </div>
        </div>
      )}

      <Button icon={<Plus className="button__icon" size={16} />} onClick={submit} variant="secondary">Adicionar material</Button>
    </div>
  )
}
