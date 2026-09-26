import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ExternalLink, FileAudio2, LoaderCircle, Search, Upload, X } from 'lucide-react'
import type { Instrument, MaterialType } from '../../../types'
import { Button } from '../../../design-system/components'
import { findYouTubeVideos, youtubeSearchEnabled } from '../../../lib/youtube'
import type { YouTubeVideo } from '../../../lib/youtube'
import { formatBytes } from '../../../utils/format'
import { AddMaterialForm } from '../AddMaterialForm'
import type { NewMaterialDraft } from '../AddMaterialForm'
import styles from './MediaAddDrawer.module.css'

type MediaAddDrawerProps = {
  instruments: Instrument[]
  onAdd: (draft: NewMaterialDraft) => void
  onClose: () => void
  onCreateInstrument: (name: string) => Instrument
}

type DrawerStep = 'choose' | 'file' | 'youtube'

function fileNameWithoutExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim()
}

function defaultTypeFor(file: File): MaterialType {
  if (file.type.startsWith('audio/')) {
    return 'audio_guide'
  }
  if (file.type.startsWith('video/')) {
    return 'playback'
  }
  return 'other'
}

export function MediaAddDrawer({ instruments, onAdd, onClose, onCreateInstrument }: MediaAddDrawerProps) {
  const [step, setStep] = useState<DrawerStep>('choose')
  const [file, setFile] = useState<File | null>(null)
  const [youtubeInput, setYoutubeInput] = useState('')
  const [youtubeResults, setYoutubeResults] = useState<YouTubeVideo[]>([])
  const [youtubeLoading, setYoutubeLoading] = useState(false)
  const [youtubeError, setYoutubeError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const firstActionRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    firstActionRef.current?.focus()

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [onClose])

  useEffect(() => {
    if (step !== 'youtube') {
      return
    }
    const term = youtubeInput.trim()
    if (!term) {
      setYoutubeResults([])
      setYoutubeLoading(false)
      setYoutubeError('')
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setYoutubeLoading(true)
      setYoutubeError('')
      try {
        setYoutubeResults(await findYouTubeVideos(term, controller.signal))
      } catch (error) {
        if (!controller.signal.aborted) {
          setYoutubeResults([])
          setYoutubeError(error instanceof Error ? error.message : 'Não foi possível pesquisar no YouTube agora.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setYoutubeLoading(false)
        }
      }
    }, term.includes('youtu') ? 120 : 500)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [step, youtubeInput])

  function chooseFile(selectedFile: File | undefined) {
    if (!selectedFile) {
      return
    }
    setFile(selectedFile)
    setStep('file')
  }

  function addFile(draft: NewMaterialDraft) {
    if (!file) {
      return
    }
    onAdd({
      ...draft,
      file_name: file.name,
      content_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
      preview_url: file.type.startsWith('video/') || file.type.startsWith('audio/') ? URL.createObjectURL(file) : undefined,
    })
  }

  function addYouTubeVideo(video: YouTubeVideo) {
    onAdd({
      name: video.title,
      material_type: 'playback',
      target_type: 'voice',
      voice_labels: [],
      instrument_ids: [],
      content_type: 'video/youtube',
      external_url: video.url,
    })
  }

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section aria-describedby="media-drawer-description" aria-labelledby="media-drawer-title" aria-modal="true" className={styles.drawer} role="dialog">
        {step === 'choose' ? (
          <div className={styles.choice}>
            <div className={styles.heading}>
              <span className={styles.eyebrow}>Mídias da música</span>
              <h2 id="media-drawer-title">Adicionar mídia</h2>
              <p id="media-drawer-description">Importe um arquivo do seu dispositivo ou adicione o link de um vídeo do YouTube.</p>
            </div>

            <div className={styles.options}>
              <button className={`${styles.option} ${styles.optionPrimary}`} onClick={() => fileInputRef.current?.click()} ref={firstActionRef} type="button">
                <Upload aria-hidden="true" size={24} />
                <span>Enviar arquivo</span>
              </button>
              <input
                accept="audio/*,video/*"
                className={styles.fileInput}
                onChange={(event) => chooseFile(event.target.files?.[0])}
                ref={fileInputRef}
                type="file"
              />
              <button className={`${styles.option} ${styles.optionSecondary}`} onClick={() => setStep('youtube')} type="button">
                <svg aria-hidden="true" className={styles.youtubeIcon} viewBox="0 0 28 20">
                  <rect fill="currentColor" height="20" rx="5" width="28" />
                  <path d="M11 5.5 19 10l-8 4.5z" fill="#fff" />
                </svg>
                <span>Adicionar vídeo do YouTube</span>
              </button>
            </div>

            <button className={styles.cancel} onClick={onClose} type="button">Cancelar</button>
          </div>
        ) : (
          <div className={`${styles.details} ${step === 'youtube' ? styles.youtubeDetails : ''}`}>
            <div className={styles.drawerNav}>
              <button className={styles.back} onClick={() => { setStep('choose'); setFile(null); setYoutubeInput('') }} type="button">
                <ArrowLeft aria-hidden="true" size={16} />
                Voltar
              </button>
              {step === 'youtube' ? <button aria-label="Fechar" className={styles.close} onClick={onClose} type="button"><X aria-hidden="true" size={20} /></button> : null}
            </div>
            <div className={styles.heading}>
              <span className={styles.eyebrow}>Adicionar mídia</span>
              <h2 id="media-drawer-title">{step === 'file' ? 'Detalhes do arquivo' : 'Adicionar vídeo do YouTube'}</h2>
              <p id="media-drawer-description">{step === 'file' ? 'Defina como esta mídia será identificada e para quem ela ficará disponível.' : 'Pesquise por título ou cole uma URL para adicionar o vídeo à música.'}</p>
            </div>

            {step === 'file' && file ? (
              <div className={styles.sourceCard}>
                <span className={styles.sourceIcon}><FileAudio2 aria-hidden="true" size={20} /></span>
                <span className={styles.sourceText}><strong>{file.name}</strong><small>{file.type || 'Arquivo de mídia'} · {formatBytes(file.size)}</small></span>
                <button className={styles.change} onClick={() => fileInputRef.current?.click()} type="button">Trocar</button>
                <input
                  accept="audio/*,video/*"
                  className={styles.fileInput}
                  onChange={(event) => chooseFile(event.target.files?.[0])}
                  ref={fileInputRef}
                  type="file"
                />
              </div>
            ) : null}

            {step === 'youtube' ? (
              <div className={styles.youtubeSearch}>
                <label className={styles.searchBox}>
                  <Search aria-hidden="true" size={19} />
                  <input aria-label="Pesquisar ou colar URL do YouTube" autoFocus onChange={(event) => setYoutubeInput(event.target.value)} placeholder="Pesquisar ou colar URL" value={youtubeInput} />
                  {youtubeLoading ? <LoaderCircle aria-label="Pesquisando" className={styles.spinner} size={19} /> : null}
                </label>

                <div aria-live="polite" className={styles.results}>
                  {!youtubeInput.trim() ? <p className={styles.searchHint}>Digite o nome de um vídeo ou cole uma URL do YouTube.</p> : null}
                  {youtubeError ? <p className={styles.searchError}>{youtubeError}</p> : null}
                  {youtubeInput.trim() && !youtubeSearchEnabled && !youtubeInput.includes('youtu') ? (
                    <div className={styles.searchUnavailable}>
                      <p>A pesquisa integrada precisa de uma chave da YouTube Data API. Você ainda pode colar a URL de qualquer vídeo.</p>
                      <button onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeInput.trim())}`, '_blank', 'noopener,noreferrer')} type="button">
                        Pesquisar no YouTube <ExternalLink aria-hidden="true" size={14} />
                      </button>
                    </div>
                  ) : null}
                  {!youtubeLoading && youtubeInput.trim() && youtubeSearchEnabled && youtubeResults.length === 0 && !youtubeError ? <p className={styles.searchHint}>Nenhum vídeo encontrado.</p> : null}
                  {youtubeResults.map((video) => (
                    <button className={styles.result} key={video.id} onClick={() => addYouTubeVideo(video)} type="button">
                      <img alt="" src={video.thumbnailURL} />
                      <span><strong>{video.title}</strong><small>{video.channel}</small></span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <AddMaterialForm
                  defaultType={file ? defaultTypeFor(file) : 'audio_guide'}
                  initialName={file ? fileNameWithoutExtension(file.name) : ''}
                  instruments={instruments}
                  key={file?.name ?? 'file'}
                  onAdd={addFile}
                  onCreateInstrument={onCreateInstrument}
                  submitLabel="Adicionar mídia"
                />
                <Button className={styles.detailsCancel} onClick={onClose} variant="quiet">Cancelar</Button>
              </>
            )}
          </div>
        )}
      </section>
    </div>,
    document.body,
  )
}
