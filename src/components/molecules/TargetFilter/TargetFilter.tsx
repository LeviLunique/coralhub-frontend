import { toggleInArray } from '../../../lib/collections'
import type { FilterMode, FilterState } from '../../../lib/materialFilter'
import { voiceLabelDisplay } from '../../../lib/voice'
import styles from './TargetFilter.module.css'

export type InstrumentOption = { id: string; name: string }

type TargetFilterProps = {
  value: FilterState
  voiceOptions: string[]
  instrumentOptions: InstrumentOption[]
  onChange: (filter: FilterState) => void
}

const MODES: { mode: FilterMode; label: string }[] = [
  { mode: 'all', label: 'Todos' },
  { mode: 'voice', label: 'Voz' },
  { mode: 'instrument', label: 'Instrumento' },
]

// Filter materials by audience: all / voice types / instruments (with chip refinement).
export function TargetFilter({ value, voiceOptions, instrumentOptions, onChange }: TargetFilterProps) {
  return (
    <div className={styles.filters}>
      <div aria-label="Filtrar por" className={styles.segmented} role="tablist">
        {MODES.map(({ mode, label }) => (
          <button
            aria-selected={value.mode === mode}
            className={`${styles.segItem} ${value.mode === mode ? styles.segItemActive : ''}`}
            key={mode}
            onClick={() => onChange({ ...value, mode })}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {value.mode === 'voice' ? (
        <div className={styles.chips}>
          <button className={`${styles.chip} ${value.voices.length === 0 ? styles.chipActive : ''}`} onClick={() => onChange({ ...value, voices: [] })} type="button">Todos os naipes</button>
          {voiceOptions.map((label) => (
            <button className={`${styles.chip} ${value.voices.includes(label) ? styles.chipActive : ''}`} key={label} onClick={() => onChange({ ...value, voices: toggleInArray(value.voices, label) })} type="button">{voiceLabelDisplay(label)}</button>
          ))}
        </div>
      ) : null}

      {value.mode === 'instrument' ? (
        <div className={styles.chips}>
          {instrumentOptions.length === 0 ? (
            <small className={styles.muted}>Nenhum instrumento nesta seção.</small>
          ) : (
            <>
              <button className={`${styles.chip} ${value.instruments.length === 0 ? styles.chipActive : ''}`} onClick={() => onChange({ ...value, instruments: [] })} type="button">Todos</button>
              {instrumentOptions.map((instrument) => (
                <button className={`${styles.chip} ${value.instruments.includes(instrument.id) ? styles.chipActive : ''}`} key={instrument.id} onClick={() => onChange({ ...value, instruments: toggleInArray(value.instruments, instrument.id) })} type="button">{instrument.name}</button>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
