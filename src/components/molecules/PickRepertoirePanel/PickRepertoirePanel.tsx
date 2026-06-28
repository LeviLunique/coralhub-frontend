import type { Repertoire } from '../../../types'
import { Button } from '../../../design-system/components'
import styles from './PickRepertoirePanel.module.css'

type PickRepertoirePanelProps = {
  repertoires: Repertoire[]
  count: number
  onCancel: () => void
  onPick: (repertoireID: string) => void
}

export function PickRepertoirePanel({ repertoires, count, onCancel, onPick }: PickRepertoirePanelProps) {
  const available = repertoires.filter((repertoire) => !repertoire.archived)
  return (
    <div className={styles.panel}>
      <div>
        <h3 className={styles.title}>Adicionar a um repertório</h3>
        <p className={styles.subtitle}>{count} música{count === 1 ? '' : 's'} selecionada{count === 1 ? '' : 's'}.</p>
      </div>
      {available.length === 0 ? (
        <p className={styles.empty}>Nenhum repertório disponível.</p>
      ) : (
        <div className={styles.list}>
          {available.map((repertoire) => (
            <button className={styles.item} key={repertoire.id} onClick={() => onPick(repertoire.id)} type="button">
              <strong>{repertoire.name}</strong>
              <small>{repertoire.songs.length} música{repertoire.songs.length === 1 ? '' : 's'}</small>
            </button>
          ))}
        </div>
      )}
      <div className={styles.actions}>
        <Button onClick={onCancel} variant="quiet">Cancelar</Button>
      </div>
    </div>
  )
}
