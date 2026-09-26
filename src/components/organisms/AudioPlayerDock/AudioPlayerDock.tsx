import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Gauge, MoreHorizontal, Pause, Play, Repeat2, SkipBack, SkipForward, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react'
import type { Material } from '../../../types'
import type { NewMaterialDraft } from '../../molecules/AddMaterialForm'
import type { AudioTrackMix } from '../SongMaterialPanel'
import styles from './AudioPlayerDock.module.css'

type AudioPlayerDockProps = {
  tracks: Material[]
  mixes: Record<string, AudioTrackMix>
  canRecord: boolean
  onAddRecording: (draft: NewMaterialDraft) => void
}

type ReverbGraph = { dry: GainNode; wet: GainNode }

const DEFAULT_SPEED = 1

function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00'
  const value = Math.max(0, Math.floor(seconds))
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}

function takeName() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `TAKE_${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export function AudioPlayerDock({ tracks, mixes, canRecord, onAddRecording }: AudioPlayerDockProps) {
  const audioRefs = useRef(new Map<string, HTMLAudioElement>())
  const contextRef = useRef<AudioContext | null>(null)
  const graphsRef = useRef(new Map<string, ReverbGraph>())
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const metronomeTimerRef = useRef<number | null>(null)
  const countInTimerRef = useRef<number | null>(null)

  const [playing, setPlaying] = useState(false)
  const [activeID, setActiveID] = useState<string | null>(tracks[0]?.id ?? null)
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loop, setLoop] = useState(false)
  const [masterVolume, setMasterVolume] = useState(0.8)
  const [masterMuted, setMasterMuted] = useState(false)
  const [speed, setSpeed] = useState(DEFAULT_SPEED)
  const [semitones, setSemitones] = useState(0)
  const [playerSettingsOpen, setPlayerSettingsOpen] = useState(false)
  const [recordSettingsOpen, setRecordSettingsOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [countingIn, setCountingIn] = useState(false)
  const [recordError, setRecordError] = useState('')
  const [metronome, setMetronome] = useState(true)
  const [tempo, setTempo] = useState(120)
  const [timeSignature, setTimeSignature] = useState('4/4')
  const [countIn, setCountIn] = useState(true)
  const [countInBars, setCountInBars] = useState(2)

  const playableTracks = useMemo(() => tracks.filter((track) => Boolean(track.preview_url)), [tracks])
  const soloIDs = useMemo(() => new Set(tracks.filter((track) => mixes[track.id]?.solo).map((track) => track.id)), [tracks, mixes])
  const effectiveRate = Math.max(0.25, Math.min(4, speed * (2 ** (semitones / 12))))

  useEffect(() => {
    if (!tracks.some((track) => track.id === activeID)) {
      setActiveID(tracks[0]?.id ?? null)
    }
  }, [tracks, activeID])

  useEffect(() => {
    for (const track of tracks) {
      const audio = audioRefs.current.get(track.id)
      if (!audio) continue
      const mix = mixes[track.id] ?? { muted: false, solo: false, volume: 0.8, reverb: 0, optionsOpen: false }
      const audible = !mix.muted && (soloIDs.size === 0 || soloIDs.has(track.id))
      audio.volume = audible && !masterMuted ? Math.min(1, masterVolume * mix.volume) : 0
      audio.playbackRate = effectiveRate
      audio.preservesPitch = false
      const graph = graphsRef.current.get(track.id)
      if (graph) {
        graph.wet.gain.value = mix.reverb / 100
        graph.dry.gain.value = 1 - Math.min(0.55, mix.reverb / 180)
      }
    }
  }, [tracks, mixes, soloIDs, masterMuted, masterVolume, effectiveRate])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!playing) return
      const active = activeID ? audioRefs.current.get(activeID) : undefined
      const fallback = Array.from(audioRefs.current.values()).find((audio) => Boolean(audio.currentSrc))
      const source = active?.src ? active : fallback
      if (source) {
        setElapsed(source.currentTime)
        setDuration(Number.isFinite(source.duration) ? source.duration : 0)
      }
    }, 160)
    return () => window.clearInterval(timer)
  }, [playing, activeID])

  useEffect(() => () => {
    if (metronomeTimerRef.current) window.clearInterval(metronomeTimerRef.current)
    if (countInTimerRef.current) window.clearTimeout(countInTimerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  function ensureAudioGraph(id: string, audio: HTMLAudioElement) {
    if (graphsRef.current.has(id)) return
    const AudioContextClass = window.AudioContext
    if (!contextRef.current) contextRef.current = new AudioContextClass()
    const context = contextRef.current
    const source = context.createMediaElementSource(audio)
    const dry = context.createGain()
    const wet = context.createGain()
    const convolver = context.createConvolver()
    const impulse = context.createBuffer(2, context.sampleRate * 1.8, context.sampleRate)
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel)
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * ((1 - i / data.length) ** 2.4)
    }
    convolver.buffer = impulse
    source.connect(dry).connect(context.destination)
    source.connect(convolver).connect(wet).connect(context.destination)
    wet.gain.value = 0
    const mix = mixes[id] ?? { muted: false, solo: false, volume: 0.8, reverb: 0, optionsOpen: false }
    wet.gain.value = mix.reverb / 100
    dry.gain.value = 1 - Math.min(0.55, mix.reverb / 180)
    graphsRef.current.set(id, { dry, wet })
  }

  async function togglePlayback() {
    if (!playableTracks.length) return
    if (playing) {
      audioRefs.current.forEach((audio) => audio.pause())
      setPlaying(false)
      return
    }
    await contextRef.current?.resume()
    const starts = playableTracks.map(async (track) => {
      const audio = audioRefs.current.get(track.id)
      if (!audio) return
      ensureAudioGraph(track.id, audio)
      await audio.play()
    })
    await Promise.allSettled(starts)
    setPlaying(true)
  }

  function seek(next: number) {
    audioRefs.current.forEach((audio) => { audio.currentTime = Math.min(Number.isFinite(audio.duration) ? audio.duration : next, Math.max(0, next)) })
    setElapsed(next)
  }

  function selectAdjacent(direction: -1 | 1) {
    if (tracks.length < 2) return
    const current = Math.max(0, tracks.findIndex((track) => track.id === activeID))
    const next = (current + direction + tracks.length) % tracks.length
    setActiveID(tracks[next].id)
  }

  function tick() {
    const context = contextRef.current ?? new AudioContext()
    contextRef.current = context
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = 900
    gain.gain.setValueAtTime(0.12, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.07)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.08)
  }

  function startMetronome() {
    if (!metronome) return
    tick()
    metronomeTimerRef.current = window.setInterval(tick, 60_000 / tempo)
  }

  function stopMetronome() {
    if (metronomeTimerRef.current) window.clearInterval(metronomeTimerRef.current)
    metronomeTimerRef.current = null
  }

  async function startRecording() {
    setRecordError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const name = takeName()
        onAddRecording({
          name,
          material_type: 'audio_guide',
          target_type: 'voice',
          voice_labels: [],
          instrument_ids: [],
          file_name: `${name}.webm`,
          content_type: blob.type,
          size_bytes: blob.size,
          preview_url: URL.createObjectURL(blob),
        })
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      const begin = () => {
        setCountingIn(false)
        recorder.start(250)
        setRecording(true)
        startMetronome()
      }
      if (countIn) {
        setCountingIn(true)
        startMetronome()
        const beats = Number(timeSignature.split('/')[0]) || 4
        countInTimerRef.current = window.setTimeout(() => { stopMetronome(); begin() }, countInBars * beats * (60_000 / tempo))
      } else begin()
    } catch {
      setRecordError('Não foi possível acessar o microfone. Verifique a permissão do navegador.')
      setRecordSettingsOpen(true)
    }
  }

  function stopRecording() {
    if (countingIn) {
      if (countInTimerRef.current) window.clearTimeout(countInTimerRef.current)
      stopMetronome()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setCountingIn(false)
      return
    }
    recorderRef.current?.stop()
    stopMetronome()
    setRecording(false)
  }

  return (
    <div className={styles.shell}>
      {tracks.map((track) => (
        <audio
          key={track.id}
          loop={loop}
          onDurationChange={(event) => { if (track.id === activeID) setDuration(event.currentTarget.duration) }}
          onEnded={() => { if (!loop) setPlaying(false) }}
          ref={(node) => { if (node) audioRefs.current.set(track.id, node); else audioRefs.current.delete(track.id) }}
          src={track.preview_url}
        />
      ))}

      <div className={styles.summary}>{countingIn ? 'Contagem inicial…' : recording ? 'Gravando…' : tracks.length ? `${tracks.length} ${tracks.length === 1 ? 'áudio' : 'áudios'}` : 'Sem áudio'}</div>

      <div className={styles.masterVolume}>
        <button aria-label={masterMuted ? 'Ativar som geral' : 'Silenciar som geral'} aria-pressed={masterMuted} onClick={() => setMasterMuted((value) => !value)} type="button">{masterMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
        <input aria-label="Volume geral" max="1" min="0" onInput={(event) => setMasterVolume(Number(event.currentTarget.value))} step="0.01" type="range" value={masterVolume} />
      </div>

      <div className={styles.timeline}>
        <input aria-label="Posição da reprodução" max={duration || 1} min="0" onInput={(event) => seek(Number(event.currentTarget.value))} step="0.01" type="range" value={Math.min(elapsed, duration || 1)} />
        <span>{clock(elapsed)}</span><span>{clock(duration)}</span>
      </div>

      <div className={styles.transport}>
        <button aria-label="Configurações do player" className={playerSettingsOpen ? styles.active : ''} disabled={!tracks.length} onClick={() => { setRecordSettingsOpen(false); setPlayerSettingsOpen((value) => !value) }} type="button"><SlidersHorizontal size={18} /></button>
        <button aria-label="Áudio anterior" disabled={tracks.length < 2} onClick={() => selectAdjacent(-1)} type="button"><SkipBack size={21} /></button>
        <button aria-label={playing ? 'Pausar áudios' : 'Reproduzir áudios'} className={styles.play} disabled={!playableTracks.length} onClick={() => void togglePlayback()} type="button">{playing ? <Pause fill="currentColor" size={22} /> : <Play fill="currentColor" size={22} />}</button>
        <button aria-label="Próximo áudio" disabled={tracks.length < 2} onClick={() => selectAdjacent(1)} type="button"><SkipForward size={21} /></button>
        <button aria-label={loop ? 'Desativar loop' : 'Ativar loop'} aria-pressed={loop} className={loop ? styles.active : ''} onClick={() => setLoop((value) => !value)} type="button"><Repeat2 size={21} /></button>
        {canRecord ? <button aria-label={recording || countingIn ? 'Parar gravação' : 'Iniciar gravação'} className={`${styles.record} ${recording || countingIn ? styles.recording : ''}`} onClick={recording || countingIn ? stopRecording : () => void startRecording()} type="button"><Circle fill="currentColor" size={18} /></button> : null}
        {canRecord ? <button aria-label="Configurações de gravação" className={recordSettingsOpen ? styles.active : ''} onClick={() => { setPlayerSettingsOpen(false); setRecordSettingsOpen((value) => !value) }} type="button"><MoreHorizontal size={20} /></button> : null}
      </div>

      {playerSettingsOpen ? (
        <div className={`${styles.popover} ${styles.playerPopover}`}>
          <h3><Gauge size={18} /> Execução</h3>
          <label>Velocidade <input max="2" min="0.5" onChange={(event) => setSpeed(Number(event.target.value))} step="0.05" type="number" value={speed} /> ×</label>
          <div className={styles.adjust}><button onClick={() => setSpeed((value) => Math.max(0.5, value - 0.05))} type="button">−</button><button onClick={() => setSpeed((value) => Math.min(2, value + 0.05))} type="button">+</button><button onClick={() => setSpeed(DEFAULT_SPEED)} type="button">Resetar</button></div>
          <label>Transposição <input max="12" min="-12" onChange={(event) => setSemitones(Number(event.target.value))} type="number" value={semitones} /> semitons</label>
          <div className={styles.adjust}><button onClick={() => setSemitones((value) => Math.max(-12, value - 1))} type="button">−1</button><button onClick={() => setSemitones((value) => Math.min(12, value + 1))} type="button">+1</button><button onClick={() => setSemitones(0)} type="button">Resetar</button></div>
        </div>
      ) : null}

      {recordSettingsOpen ? (
        <div className={`${styles.popover} ${styles.recordPopover}`}>
          <h3>Gravação</h3>
          <label className={styles.toggle}><input checked={metronome} onChange={(event) => setMetronome(event.target.checked)} type="checkbox" /> Metrônomo</label>
          <label>Tempo <input max="260" min="30" onChange={(event) => setTempo(Number(event.target.value))} type="number" value={tempo} /> bpm</label>
          <label>Compasso <select onChange={(event) => setTimeSignature(event.target.value)} value={timeSignature}><option>2/4</option><option>3/4</option><option>4/4</option><option>6/8</option></select></label>
          <label className={styles.toggle}><input checked={countIn} onChange={(event) => setCountIn(event.target.checked)} type="checkbox" /> Contagem inicial</label>
          <label>Contagem <input disabled={!countIn} max="8" min="1" onChange={(event) => setCountInBars(Number(event.target.value))} type="number" value={countInBars} /> compassos</label>
          {recordError ? <p className={styles.error}>{recordError}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
