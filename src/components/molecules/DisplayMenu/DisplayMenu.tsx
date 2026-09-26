import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Check, Columns2, Maximize, Monitor, MoveHorizontal, MoveVertical } from 'lucide-react'
import { IconButton } from '../../../design-system/components'
import styles from './DisplayMenu.module.css'

export type DisplayFit = 'width' | 'height'

type DisplayMenuProps = {
  fit: DisplayFit
  fullscreen: boolean
  pageTurnControls: boolean
  onFitChange: (fit: DisplayFit) => void
  onToggleFullscreen: () => void
  onTogglePageTurnControls: () => void
}

export function DisplayMenu({ fit, fullscreen, pageTurnControls, onFitChange, onToggleFullscreen, onTogglePageTurnControls }: DisplayMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function closeOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className={styles.root} ref={rootRef}>
      <IconButton active={open} label="Display" onClick={() => setOpen((value) => !value)}><Monitor size={19} /></IconButton>
      {open ? (
        <div aria-label="Configurações de exibição" className={styles.menu} role="menu">
          <button aria-checked="true" className={styles.item} onClick={() => setOpen(false)} role="menuitemradio" type="button">
            <Monitor size={19} /><span>Página única</span><Check className={styles.check} size={19} />
          </button>
          <button aria-checked="false" className={styles.item} disabled role="menuitemradio" type="button">
            <Columns2 size={19} /><span>Página dupla</span>
          </button>
          <span className={styles.divider} />
          <button aria-checked={fit === 'width'} className={styles.item} onClick={() => onFitChange('width')} role="menuitemradio" type="button">
            <MoveHorizontal size={19} /><span>Largura total</span>{fit === 'width' ? <Check className={styles.check} size={19} /> : null}
          </button>
          <button aria-checked={fit === 'height'} className={styles.item} onClick={() => onFitChange('height')} role="menuitemradio" type="button">
            <MoveVertical size={19} /><span>Altura total</span>{fit === 'height' ? <Check className={styles.check} size={19} /> : null}
          </button>
          <span className={styles.divider} />
          <button className={styles.item} onClick={() => { setOpen(false); onToggleFullscreen() }} role="menuitem" type="button">
            <Maximize size={19} /><span>{fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}</span>
          </button>
          <span className={styles.divider} />
          <button aria-checked={pageTurnControls} className={styles.item} onClick={onTogglePageTurnControls} role="menuitemcheckbox" type="button">
            <ArrowLeftRight size={19} /><span>Controles de página</span>{pageTurnControls ? <Check className={styles.check} size={19} /> : null}
          </button>
        </div>
      ) : null}
    </div>
  )
}
