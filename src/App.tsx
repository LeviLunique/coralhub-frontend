import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Download,
  FileText,
  GripVertical,
  Home,
  Info,
  Library,
  Music,
  Music2,
  MapPin,
  Moon,
  Plus,
  Search,
  SlidersHorizontal,
  Sun,
  UsersRound,
} from 'lucide-react'
import { api } from './api/coralhub'
import { mockData } from './data/mock'
import { Badge, Button, EmptyState, Field, IconButton, SectionTitle, SelectField, Stat } from './design-system/components'
import type { AppData, EventAlert, EventItem, Instrument, Material, Repertoire, RepertoireSong, RuntimeContext, Session, Song, ThemeMode, User, ViewKey } from './types'
import { eventTypeLabel, formatDate, formatDateTime } from './utils/format'
import { toggleInArray } from './lib/collections'
import { formString, optionalText, optionalVoiceType } from './lib/forms'
import { newID } from './lib/ids'
import { isAudioMaterial, materialMatchesRoleDefault, materialMeta } from './lib/materials'
import { voiceLabels } from './lib/voice'
import { SongsScreen } from './features/songs'
import './index.css'

const demoSession: Session = {
  tenant: {
    id: 'tenant-cjan',
    slug: 'coral-jovem-asa-norte',
    display_name: 'Coral Jovem Asa Norte',
  },
  user: {
    ...mockData.users[0],
    manager: true,
  },
}

const navItems = [
  { key: 'home', label: 'Início', icon: Home },
  { key: 'agenda', label: 'Agenda', icon: CalendarDays },
  { key: 'repertoires', label: 'Repertórios', icon: Library },
  { key: 'songs', label: 'Músicas', icon: Music },
  { key: 'instruments', label: 'Instrumentos', icon: Music2 },
  { key: 'users', label: 'Usuários', icon: UsersRound },
] as const

const eventAlertOptions: Array<{ value: EventAlert; label: string }> = [
  { value: 'none', label: 'Nenhum' },
  { value: 'at_event_time', label: 'Na hora do evento' },
  { value: 'five_minutes_before', label: '5 minutos antes' },
  { value: 'ten_minutes_before', label: '10 minutos antes' },
  { value: 'fifteen_minutes_before', label: '15 minutos antes' },
  { value: 'thirty_minutes_before', label: '30 minutos antes' },
  { value: 'one_hour_before', label: '1 hora antes' },
  { value: 'two_hours_before', label: '2 horas antes' },
  { value: 'one_day_before', label: '1 dia antes' },
  { value: 'two_days_before', label: '2 dias antes' },
  { value: 'one_week_before', label: '1 semana antes' },
]

type AgendaPeriodFilter = 'calendar' | 'today' | 'next7' | 'next30' | 'custom'
type AgendaTypeFilter = 'all' | EventItem['event_type']
type AgendaStatusFilter = 'all' | NonNullable<EventItem['status']>
type AgendaDateRange = {
  from?: Date
  to?: Date
}
type EventEditorDraft = {
  event: EventItem
  linkedRepertoireIDs: string[]
  selectedEventID: string
}
type EventRelatedCreateTarget = 'repertoire'

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())
  const [session, setSession] = useState<Session | null>(() => readStoredSession())
  const [data, setData] = useState<AppData>(mockData)
  const [activeView, setActiveView] = useState<ViewKey>('home')
  const [selectedEventID, setSelectedEventID] = useState<string | null>(null)
  const [selectedUserID, setSelectedUserID] = useState<string | null>(null)
  const [selectedInstrumentID, setSelectedInstrumentID] = useState<string | null>(null)
  const [selectedSongID, setSelectedSongID] = useState<string | null>(null)
  const [selectedRepertoireID, setSelectedRepertoireID] = useState<string | null>(null)
  const [returnView, setReturnView] = useState<ViewKey | null>(null)
  const [eventDraft, setEventDraft] = useState<EventEditorDraft | null>(null)
  const [eventRelatedCreate, setEventRelatedCreate] = useState<EventRelatedCreateTarget | null>(null)
  const [sourceMessage, setSourceMessage] = useState('Dados de demonstração disponíveis.')

  const currentUser = session?.user ?? demoSession.user
  const isManager = Boolean(currentUser.manager)
  const context = useMemo<RuntimeContext | null>(() => {
    if (!session) {
      return null
    }
    return {
      tenantSlug: session.tenant.slug,
      actorEmail: session.user.email,
    }
  }, [session])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('coralhub-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!session || !context) {
      return
    }

    let ignored = false
    api
      .loadDashboard(context)
      .then((result) => {
        if (ignored) {
          return
        }
        setData(enrichData(result, session))
        setSourceMessage('Conectado ao backend local.')
      })
      .catch((error) => {
        if (ignored) {
          return
        }
        setData(mockData)
        setSourceMessage(error instanceof Error ? `API indisponível: ${error.message}` : 'API indisponível.')
      })

    return () => {
      ignored = true
    }
  }, [context, session])

  if (!session) {
    return <LoginScreen onLogin={setSession} />
  }

  const userChoirIDs = data.memberships.filter((membership) => membership.user_id === currentUser.id).map((membership) => membership.choir_id)
  const scopedEvents = data.events.filter((event) => userChoirIDs.includes(event.choir_id))
  const activeEvents = scopedEvents.filter((event) => event.status !== 'canceled' && event.status !== 'finished' && new Date(event.end_at ?? event.start_at).getTime() >= Date.now())
  const upcomingEvents = activeEvents.sort(byStartAt).slice(0, 5)
  const nextEvent = upcomingEvents[0]

  function logout() {
    localStorage.removeItem('coralhub-session')
    setSession(null)
    setActiveView('home')
  }

  function clearSelections() {
    setSelectedEventID(null)
    setSelectedUserID(null)
    setSelectedInstrumentID(null)
    setSelectedSongID(null)
    setSelectedRepertoireID(null)
  }

  function navigateTo(view: ViewKey) {
    setReturnView(null)
    setEventDraft(null)
    setEventRelatedCreate(null)
    clearSelections()
    setActiveView(view)
  }

  function backFromDetail() {
    clearSelections()
    setEventDraft(null)
    setEventRelatedCreate(null)
    if (returnView) {
      setActiveView(returnView)
      setReturnView(null)
    }
  }

  function openFromHome(view: ViewKey, id: string) {
    setReturnView('home')
    setEventDraft(null)
    setEventRelatedCreate(null)
    setActiveView(view)
    if (view === 'agenda') {
      setSelectedEventID(id)
    }
    if (view === 'users') {
      setSelectedUserID(id)
    }
    if (view === 'instruments') {
      setSelectedInstrumentID(id)
    }
    if (view === 'songs') {
      setSelectedSongID(id)
    }
    if (view === 'repertoires') {
      setSelectedRepertoireID(id)
    }
  }

  function startEventRelatedCreate(target: EventRelatedCreateTarget, draft: EventEditorDraft) {
    setEventDraft(draft)
    setEventRelatedCreate(target)
    setActiveView('repertoires')
    setSelectedRepertoireID('new')
  }

  function returnToEventDraft() {
    if (!eventDraft) {
      backFromDetail()
      return
    }
    setSelectedRepertoireID(null)
    setSelectedEventID(eventDraft.selectedEventID)
    setActiveView('agenda')
    setEventRelatedCreate(null)
  }

  function saveUser(user: User) {
    setData((current) => ({
      ...current,
      users: upsertByID(current.users, user),
    }))
    setSelectedUserID(user.id)
  }

  function saveMaterial(material: Material) {
    setData((current) => ({
      ...current,
      materials: upsertByID(current.materials, material),
    }))
  }

  function deleteMaterial(materialID: string) {
    setData((current) => ({
      ...current,
      materials: current.materials.filter((material) => material.id !== materialID),
    }))
  }

  function createInstrument(name: string): Instrument {
    const instrument: Instrument = { ...blankInstrument(), name: name.trim() }
    setData((current) => ({
      ...current,
      instruments: [instrument, ...current.instruments],
    }))
    return instrument
  }

  function saveEvent(event: EventItem) {
    setData((current) => ({
      ...current,
      events: upsertByID(current.events, event),
    }))
    setSelectedEventID(event.id)
    setEventDraft(null)
    setEventRelatedCreate(null)
  }

  function saveSong(song: Song) {
    setData((current) => ({
      ...current,
      songs: upsertByID(current.songs, song),
    }))
    setSelectedSongID(song.id)
  }

  function deleteSong(songID: string) {
    setData((current) => ({
      ...current,
      songs: current.songs.filter((song) => song.id !== songID),
      materials: current.materials.filter((material) => material.song_id !== songID),
      repertoires: current.repertoires.map((repertoire) => {
        if (!repertoire.songs.some((entry) => entry.song_id === songID)) {
          return repertoire
        }
        return { ...repertoire, songs: repertoire.songs.filter((entry) => entry.song_id !== songID), updated_at: new Date().toISOString() }
      }),
    }))
    setSelectedSongID(null)
  }

  function saveRepertoire(repertoire: Repertoire) {
    setData((current) => ({
      ...current,
      repertoires: upsertByID(current.repertoires, repertoire),
    }))

    if (eventRelatedCreate === 'repertoire' && eventDraft) {
      setEventDraft({
        ...eventDraft,
        linkedRepertoireIDs: addUniqueID(eventDraft.linkedRepertoireIDs, repertoire.id),
      })
      setSelectedRepertoireID(null)
      setSelectedEventID(eventDraft.selectedEventID)
      setActiveView('agenda')
      setEventRelatedCreate(null)
      return
    }

    setSelectedRepertoireID(repertoire.id)
  }

  function deleteRepertoire(repertoireID: string) {
    setData((current) => ({
      ...current,
      repertoires: current.repertoires.filter((repertoire) => repertoire.id !== repertoireID),
      events: current.events.map((event) => {
        if (!event.linked_repertoire_ids?.includes(repertoireID)) {
          return event
        }
        return { ...event, linked_repertoire_ids: event.linked_repertoire_ids.filter((id) => id !== repertoireID) }
      }),
    }))
    setSelectedRepertoireID(null)
  }

  function saveInstrument(instrument: Instrument) {
    setData((current) => ({
      ...current,
      instruments: upsertByID(current.instruments, instrument),
      users: current.users.map((user) => {
        const currentInstruments = user.instruments ?? []
        const hasInstrument = instrument.user_ids.includes(user.id)
        const nextInstruments = hasInstrument
          ? Array.from(new Set([...currentInstruments, instrument.name]))
          : currentInstruments.filter((item) => item !== instrument.name)
        return { ...user, instruments: nextInstruments }
      }),
    }))
    setSelectedInstrumentID(instrument.id)
  }

  function deleteInstrument(instrumentID: string) {
    setData((current) => ({
      ...current,
      instruments: current.instruments.filter((instrument) => instrument.id !== instrumentID),
    }))
    setSelectedInstrumentID(null)
  }

  return (
    <div className={`app-shell ${activeView === 'songs' ? 'app-shell--with-rail' : ''}`}>
      <aside className="sidebar">
        <button className="profile-card" onClick={() => navigateTo('profile')} type="button">
          <span className="avatar">{initials(currentUser.full_name)}</span>
          <span>
            <strong>{currentUser.full_name}</strong>
            <small>{currentUser.email}</small>
          </span>
        </button>

        <nav className="nav-list" aria-label="Navegação principal">
          {navItems.map((item) => {
            if ((item.key === 'users' || item.key === 'instruments') && !isManager) {
              return null
            }
            const Icon = item.icon
            return (
              <button className={`nav-item ${activeView === item.key ? 'is-active' : ''}`} key={item.key} onClick={() => navigateTo(item.key)} type="button">
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <button className="nav-item nav-item--logout" onClick={logout} type="button">
          <DoorOpen size={18} aria-hidden="true" />
          <span>Sair</span>
        </button>

        <div className="sidebar-footer">
          <strong>CoralHub</strong>
          <span>v0.1.0</span>
          <small>{sourceMessage}</small>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">{session.tenant.display_name}</span>
            {activeView === 'songs' ? null : <h1>{pageTitle(activeView)}</h1>}
          </div>
          <div className="topbar__actions">
            <IconButton label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </IconButton>
          </div>
        </header>

        {activeView === 'home' ? (
          <HomeView
            events={upcomingEvents}
            instruments={data.instruments}
            isManager={isManager}
            materials={data.materials}
            materialsEvents={activeEvents}
            nextEvent={nextEvent}
            onOpenEvent={(eventID) => {
              openFromHome('agenda', eventID)
            }}
            onQuickAction={(view) => {
              if (view === 'users') {
                openFromHome('users', 'new')
              }
              if (view === 'songs') {
                openFromHome('songs', 'new')
              }
              if (view === 'agenda') {
                openFromHome('agenda', 'new')
              }
            }}
            repertoires={data.repertoires}
            songs={data.songs}
            totals={{ events: activeEvents.length, songs: data.songs.length, users: data.users.length }}
            user={currentUser}
          />
        ) : null}

        {activeView === 'agenda' ? (
          <AgendaView
            choirID={userChoirIDs[0] ?? data.choirs[0]?.id ?? 'choir-principal'}
            eventDraft={eventDraft}
            events={scopedEvents}
            isManager={isManager}
            onStartRelatedCreate={startEventRelatedCreate}
            onSaveEvent={saveEvent}
            onBackFromDetail={backFromDetail}
            repertoires={data.repertoires}
            songs={data.songs}
            selectedEventID={selectedEventID}
            setSelectedEventID={setSelectedEventID}
            tenantID={session.tenant.id}
          />
        ) : null}

        {activeView === 'repertoires' ? (
          <RepertoiresView
            events={scopedEvents}
            isManager={isManager}
            onBackFromDetail={eventRelatedCreate === 'repertoire' ? returnToEventDraft : backFromDetail}
            onDeleteRepertoire={deleteRepertoire}
            onSaveRepertoire={saveRepertoire}
            repertoires={data.repertoires}
            selectedRepertoireID={selectedRepertoireID}
            setSelectedRepertoireID={setSelectedRepertoireID}
            songs={data.songs}
            tenantID={session.tenant.id}
            choirID={userChoirIDs[0] ?? data.choirs[0]?.id ?? 'choir-principal'}
            isRelatedCreate={eventRelatedCreate === 'repertoire'}
          />
        ) : null}

        {activeView === 'songs' ? (
          <SongsScreen
            instruments={data.instruments}
            isManager={isManager}
            materials={data.materials}
            onBackFromDetail={backFromDetail}
            onCreateInstrument={createInstrument}
            onDeleteMaterial={deleteMaterial}
            onDeleteSong={deleteSong}
            onSaveMaterial={saveMaterial}
            onSaveRepertoire={saveRepertoire}
            onSaveSong={saveSong}
            repertoires={data.repertoires}
            selectedSongID={selectedSongID}
            setSelectedSongID={setSelectedSongID}
            songs={data.songs}
            tenantID={session.tenant.id}
            choirID={userChoirIDs[0] ?? data.choirs[0]?.id ?? 'choir-principal'}
            user={currentUser}
          />
        ) : null}
        {/* SongsScreen renders the Músicas library (Atomic Design: see src/components + src/features/songs) */}

        {activeView === 'instruments' ? (
          <InstrumentsView
            instruments={data.instruments}
            isManager={isManager}
            materials={data.materials}
            onBackFromDetail={backFromDetail}
            onDeleteInstrument={deleteInstrument}
            onSaveInstrument={saveInstrument}
            selectedInstrumentID={selectedInstrumentID}
            setSelectedInstrumentID={setSelectedInstrumentID}
            users={data.users}
          />
        ) : null}

        {activeView === 'users' ? (
          <UsersView
            selectedUserID={selectedUserID}
            setSelectedUserID={setSelectedUserID}
            onSaveUser={saveUser}
            onBackFromDetail={backFromDetail}
            tenantID={session.tenant.id}
            users={data.users}
          />
        ) : null}

        {activeView === 'profile' ? <ProfileView user={currentUser} /> : null}
      </main>
      {activeView === 'songs' ? <aside className="detail-rail" id="song-detail-rail" /> : null}
    </div>
  )
}

function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '').trim()
    setError('')
    setLoading(true)

    try {
      const result = await api.login({ email, password })
      localStorage.setItem('coralhub-session', JSON.stringify(result))
      onLogin(result)
    } catch {
      if (email.toLowerCase() === demoSession.user.email && password.length > 0) {
        localStorage.setItem('coralhub-session', JSON.stringify(demoSession))
        onLogin(demoSession)
      } else {
        setError('Não foi possível autenticar. Para demo, use ana@coralhub.local com qualquer senha.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <img src="/coralhub-mark.jpg" alt="CoralHub" />
        <h1>CoralHub</h1>
        <p>Gestão de agenda, materiais e usuários para corais multi-tenant.</p>
      </section>
      <form className="login-panel" onSubmit={submit}>
        <SectionTitle eyebrow="Acesso" title="Entrar" />
        <Field defaultValue="ana@coralhub.local" label="E-mail" name="email" type="email" />
        <Field defaultValue="demo" label="Senha" name="password" type="password" />
        {error ? <p className="form-error">{error}</p> : null}
        <Button loading={loading} type="submit" variant="primary">Entrar</Button>
      </form>
    </main>
  )
}

function HomeView({
  events,
  instruments,
  isManager,
  materials,
  materialsEvents,
  nextEvent,
  onOpenEvent,
  onQuickAction,
  repertoires,
  songs,
  totals,
  user,
}: {
  events: EventItem[]
  instruments: Instrument[]
  isManager: boolean
  materials: Material[]
  materialsEvents: EventItem[]
  nextEvent?: EventItem
  onOpenEvent: (eventID: string) => void
  onQuickAction: (view: ViewKey) => void
  repertoires: Repertoire[]
  songs: Song[]
  totals: { users: number; songs: number; events: number }
  user: User
}) {
  return (
    <div className="view-stack">
      {isManager ? (
        <section className="stats-grid">
          <Stat detail="Membros ativos" label="Usuários" value={totals.users} />
          <Stat detail="No repertório" label="Músicas" value={totals.songs} />
          <Stat detail="Compromissos ativos" label="Eventos" value={totals.events} />
          <Stat detail="Próximo evento" label="Agenda" value={nextEvent ? formatDate(nextEvent.start_at) : '-'} />
        </section>
      ) : null}

      <section className="panel">
        <SectionTitle
          eyebrow="Agenda"
          title="Próximos eventos"
          action={
            <span className="info-hint" tabIndex={0}>
              <Info size={16} aria-hidden="true" />
              <span className="info-hint__bubble" role="tooltip">São exibidos apenas os 5 eventos mais próximos de acontecer. Role para o lado para ver os demais.</span>
            </span>
          }
        />
        {events.length > 0 ? (
          <div className="event-strip">
            {events.map((event, index) => (
              <button className={`event-card ${index === 0 ? 'event-card--featured' : ''}`} key={event.id} onClick={() => onOpenEvent(event.id)} type="button">
                <div className="event-card__date">
                  <strong>{formatDate(event.start_at)}</strong>
                  <span>{new Date(event.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <Badge tone={event.event_type === 'presentation' ? 'blue' : 'gold'}>{index === 0 ? `Próximo · ${eventTypeLabel(event.event_type)}` : eventTypeLabel(event.event_type)}</Badge>
                <strong>{event.title}</strong>
                <small>{event.location ?? 'Local não informado'}</small>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState icon={<CalendarDays size={22} />} title="Sem eventos" body="Ainda não há compromissos ativos para o seu coral." />
        )}
      </section>

      {isManager ? (
        <section className="quick-actions">
          <Button icon={<Plus className="button__icon" size={16} />} onClick={() => onQuickAction('users')} variant="primary">Cadastrar usuário</Button>
          <Button icon={<Plus className="button__icon" size={16} />} onClick={() => onQuickAction('songs')} variant="secondary">Cadastrar música</Button>
          <Button icon={<Plus className="button__icon" size={16} />} onClick={() => onQuickAction('agenda')} variant="secondary">Cadastrar evento</Button>
        </section>
      ) : null}

      <MaterialsSection events={materialsEvents} instruments={instruments} materials={materials} repertoires={repertoires} songs={songs} user={user} />
    </div>
  )
}

function MaterialsSection({
  events,
  instruments,
  materials,
  repertoires,
  songs,
  user,
}: {
  events: EventItem[]
  instruments: Instrument[]
  materials: Material[]
  repertoires: Repertoire[]
  songs: Song[]
  user: User
}) {
  const [selectedEventIDs, setSelectedEventIDs] = useState<string[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  function userSeesMaterial(material: Material) {
    if (material.archived) {
      return false
    }
    return materialMatchesRoleDefault(material, user, instruments)
  }

  function songsForEvent(event: EventItem): Song[] {
    const repertoireIDs = new Set(event.linked_repertoire_ids ?? [])
    const order = new Map<string, number>()
    repertoires
      .filter((repertoire) => repertoireIDs.has(repertoire.id))
      .forEach((repertoire) => {
        repertoire.songs.forEach((entry) => {
          const current = order.get(entry.song_id)
          if (current === undefined || entry.execution_order < current) {
            order.set(entry.song_id, entry.execution_order)
          }
        })
      })
    return Array.from(order.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([songID]) => songs.find((song) => song.id === songID))
      .filter((song): song is Song => Boolean(song))
  }

  const visibleEvents = events.filter((event) => selectedEventIDs.length === 0 || selectedEventIDs.includes(event.id))
  const eventBlocks = visibleEvents
    .map((event) => ({
      event,
      songBlocks: songsForEvent(event)
        .map((song) => ({
          song,
          items: materials
            .filter((material) => material.song_id === song.id && userSeesMaterial(material))
            .map((material) => ({ material, key: `${event.id}::${material.id}` })),
        }))
        .filter((block) => block.items.length > 0),
    }))
    .filter((entry) => entry.songBlocks.length > 0)

  const allKeys = eventBlocks.flatMap((entry) => entry.songBlocks.flatMap((block) => block.items.map((item) => item.key)))
  const selectedCount = selectedItems.filter((key) => allKeys.includes(key)).length

  return (
    <section className="panel">
      <SectionTitle eyebrow="Estudo" title="Meus Materiais" />
      <div className="filter-group">
        <strong>Filtrar por evento</strong>
        <div className="filter-options">
          <FilterChip active={selectedEventIDs.length === 0} onClick={() => setSelectedEventIDs([])}>Todos os eventos</FilterChip>
          {events.map((event) => (
            <FilterChip active={selectedEventIDs.includes(event.id)} key={event.id} onClick={() => setSelectedEventIDs((current) => toggleInArray(current, event.id))}>
              {event.title}
            </FilterChip>
          ))}
        </div>
      </div>

      {eventBlocks.length === 0 ? (
        <EmptyState icon={<Music size={22} />} title="Nenhum material disponível" body="Os materiais de estudo aparecem aqui conforme os repertórios dos seus eventos." />
      ) : (
        <div className="materials">
          {selectedCount > 0 ? (
            <div className="materials__selection">
              <strong>{selectedCount} {selectedCount === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}</strong>
              <span className="materials__selection-actions">
                <Button icon={<Download className="button__icon" size={14} />} size="sm" variant="primary">Baixar selecionados</Button>
                <Button onClick={() => setSelectedItems([])} size="sm" variant="quiet">Limpar seleção</Button>
              </span>
            </div>
          ) : null}

          {eventBlocks.map(({ event, songBlocks }) => (
            <div className="materials__event" key={event.id}>
              <div className="materials__event-header">
                <h3>Evento: {event.title}</h3>
                {user.voice_type ? <Badge tone="blue">Voz: {voiceLabels[user.voice_type]}</Badge> : null}
              </div>
              {songBlocks.map(({ song, items }) => (
                <div className="material-card" key={song.id}>
                  <div className="material-card__song"><Music size={16} /> <strong>{song.title}</strong></div>
                  {items.map(({ material, key }) => {
                    const isAudio = isAudioMaterial(material)
                    return (
                      <div className={`material-row ${selectedItems.includes(key) ? 'is-selected' : ''}`} key={key}>
                        <label className="material-row__select">
                          <input checked={selectedItems.includes(key)} onChange={() => setSelectedItems((current) => toggleInArray(current, key))} type="checkbox" />
                          <span className="material-row__file">
                            {isAudio ? <Music size={14} /> : <FileText size={14} />}
                            <span>
                              <strong>{material.name}</strong>
                              <small>{materialMeta(material)}</small>
                            </span>
                          </span>
                        </label>
                        <span className="material-row__actions">
                          <Button size="sm" variant="quiet">{isAudio ? 'Ouvir' : 'Visualizar'}</Button>
                          <Button icon={<Download className="button__icon" size={14} />} size="sm" variant="quiet">Baixar</Button>
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}

          <div className="materials__footer">
            <Button icon={<Download className="button__icon" size={16} />} variant="secondary">Baixar tudo</Button>
          </div>
        </div>
      )}
    </section>
  )
}

function AgendaView({
  choirID,
  eventDraft,
  events,
  isManager,
  onBackFromDetail,
  onSaveEvent,
  onStartRelatedCreate,
  repertoires,
  songs,
  selectedEventID,
  setSelectedEventID,
  tenantID,
}: {
  choirID: string
  eventDraft: EventEditorDraft | null
  events: EventItem[]
  isManager: boolean
  onBackFromDetail: () => void
  onSaveEvent: (event: EventItem) => void
  onStartRelatedCreate: (target: EventRelatedCreateTarget, draft: EventEditorDraft) => void
  repertoires: Repertoire[]
  songs: Song[]
  selectedEventID: string | null
  setSelectedEventID: (eventID: string | null) => void
  tenantID: string
}) {
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [periodFilter, setPeriodFilter] = useState<AgendaPeriodFilter>('calendar')
  const [typeFilter, setTypeFilter] = useState<AgendaTypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<AgendaStatusFilter>('active')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const activeEventDraft = eventDraft?.selectedEventID === selectedEventID ? eventDraft : null
  const selectedEvent = activeEventDraft?.event ?? (selectedEventID === 'new' ? blankEvent(tenantID, choirID) : events.find((event) => event.id === selectedEventID))
  const periodRange = getAgendaPeriodRange(periodFilter, selectedDate, customStart, customEnd)
  const hasActiveAgendaFilters = periodFilter !== 'calendar' || typeFilter !== 'all' || statusFilter !== 'active' || customStart !== '' || customEnd !== ''
  const filteredEvents = events
    .filter((event) => event.title.toLowerCase().includes(query.toLowerCase()))
    .filter((event) => typeFilter === 'all' || event.event_type === typeFilter)
    .filter((event) => statusFilter === 'all' || (event.status ?? 'active') === statusFilter)
    .filter((event) => eventOverlapsRange(event, periodRange))
    .sort(byStartAt)

  if (selectedEvent) {
    return (
      <EventDetail
        event={selectedEvent}
        isManager={isManager}
        isNew={selectedEventID === 'new'}
        onBack={onBackFromDetail}
        onSave={onSaveEvent}
        onStartRelatedCreate={onStartRelatedCreate}
        repertoires={repertoires.filter((repertoire) => repertoire.choir_id === selectedEvent.choir_id)}
        selectedEventID={selectedEventID}
        selectedRepertoireIDsDraft={activeEventDraft?.linkedRepertoireIDs}
        songs={songs}
      />
    )
  }

  function clearAgendaFilters() {
    setSelectedDate(new Date())
    setPeriodFilter('calendar')
    setTypeFilter('all')
    setStatusFilter('active')
    setCustomStart('')
    setCustomEnd('')
  }

  return (
    <div className="view-stack">
      <section className="panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={16} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar evento" value={query} />
          </div>
          <Button icon={<SlidersHorizontal className="button__icon" size={16} />} onClick={() => setShowFilters((value) => !value)} variant="quiet">Filtros</Button>
          {isManager ? <Button icon={<Plus className="button__icon" size={16} />} onClick={() => setSelectedEventID('new')} variant="primary">Novo</Button> : null}
        </div>
        {showFilters ? (
          <FilterPanel
            customEnd={customEnd}
            customStart={customStart}
            hasActiveFilters={hasActiveAgendaFilters}
            onClearFilters={clearAgendaFilters}
            periodFilter={periodFilter}
            setCustomEnd={setCustomEnd}
            setCustomStart={setCustomStart}
            setPeriodFilter={setPeriodFilter}
            setStatusFilter={setStatusFilter}
            setTypeFilter={setTypeFilter}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
          />
        ) : null}
      </section>

      <section className="panel">
        <CalendarCompact
          events={filteredEvents}
          onSelectDate={(date) => {
            setSelectedDate(date)
            setPeriodFilter('calendar')
          }}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />
      </section>

      <section className="panel">
        <SectionTitle eyebrow={agendaPeriodLabel(periodFilter, selectedDate, customStart, customEnd)} title="Lista cronológica" />
        <div className="timeline">
          {filteredEvents.map((event) => (
            <button className="timeline-item timeline-item--button" key={event.id} onClick={() => setSelectedEventID(event.id)} type="button">
              <div className="date-tile date-tile--small">
                <strong>{formatDate(event.start_at)}</strong>
                <span>{new Date(event.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div>
                <Badge tone={event.event_type === 'presentation' ? 'blue' : 'gold'}>{eventTypeLabel(event.event_type)}</Badge>
                <Badge tone={eventStatusTone(event.status)}>{eventStatusLabel(event.status)}</Badge>
                <h3>{event.title}</h3>
                <p>{event.location ?? 'Local não informado'}</p>
                <small>{event.end_at ? `${formatDateTime(event.start_at)} - ${new Date(event.end_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : formatDateTime(event.start_at)}</small>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function EventDetail({
  event,
  isManager,
  isNew,
  onBack,
  onSave,
  onStartRelatedCreate,
  repertoires,
  selectedEventID,
  selectedRepertoireIDsDraft,
  songs,
}: {
  event: EventItem
  isManager: boolean
  isNew: boolean
  onBack: () => void
  onSave: (event: EventItem) => void
  onStartRelatedCreate: (target: EventRelatedCreateTarget, draft: EventEditorDraft) => void
  repertoires: Repertoire[]
  selectedEventID: string | null
  selectedRepertoireIDsDraft?: string[]
  songs: Song[]
}) {
  const disabled = !isManager
  const initialPrimaryAlert = event.alerts?.[0] ?? 'none'
  const initialSecondaryAlert = event.alerts?.[1] ?? 'none'
  const [title, setTitle] = useState(event.title)
  const [eventType, setEventType] = useState(event.event_type)
  const [startDate, setStartDate] = useState(toDateInput(event.start_at))
  const [startTime, setStartTime] = useState(toTimeInput(event.start_at))
  const [endDate, setEndDate] = useState(event.end_at ? toDateInput(event.end_at) : '')
  const [endTime, setEndTime] = useState(event.end_at ? toTimeInput(event.end_at) : '')
  const [location, setLocation] = useState(event.location ?? '')
  const [address, setAddress] = useState(event.address ?? '')
  const [mapsUrl, setMapsUrl] = useState(event.maps_url ?? '')
  const [description, setDescription] = useState(event.description ?? '')
  const [primaryAlert, setPrimaryAlert] = useState<EventAlert>(initialPrimaryAlert)
  const [secondaryAlert, setSecondaryAlert] = useState<EventAlert>(initialSecondaryAlert)
  const [selectedRepertoireIDs, setSelectedRepertoireIDs] = useState<string[]>(selectedRepertoireIDsDraft ?? event.linked_repertoire_ids ?? [])

  function currentDraft(): EventEditorDraft {
    const firstAlert = primaryAlert
    const secondAlert = firstAlert === 'none' ? 'none' : secondaryAlert
    const alerts = firstAlert === 'none' ? [] : secondAlert === 'none' ? [firstAlert] : [firstAlert, secondAlert]

    return {
      event: {
        ...event,
        title: title.trim() || event.title,
        event_type: eventType,
        start_at: startDate ? new Date(`${startDate}T${startTime || '00:00'}`).toISOString() : event.start_at,
        end_at: endDate ? new Date(`${endDate}T${endTime || '00:00'}`).toISOString() : undefined,
        location: optionalText(location.trim()),
        address: optionalText(address.trim()),
        maps_url: optionalText(mapsUrl.trim()),
        description: optionalText(description.trim()),
        alerts,
        linked_repertoire_ids: selectedRepertoireIDs,
        active: true,
      },
      linkedRepertoireIDs: selectedRepertoireIDs,
      selectedEventID: selectedEventID ?? event.id,
    }
  }

  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const draft = currentDraft()
    onSave(draft.event)
  }

  return (
    <form className="detail-form" onSubmit={submit}>
      <SectionTitle eyebrow="Evento" title={isNew ? 'Cadastrar evento' : isManager ? 'Detalhes e edição' : event.title} action={<Button onClick={onBack} variant="quiet">Voltar</Button>} />
      <Field disabled={disabled} label="Nome" name="title" onChange={(event) => setTitle(event.target.value)} value={title} />
      <SelectField disabled={disabled} label="Tipo" name="event_type" onChange={(event) => setEventType(event.target.value)} value={eventType}>
        <option value="rehearsal">Ensaio</option>
        <option value="presentation">Apresentação</option>
        <option value="other">Outro</option>
      </SelectField>
      <div className="form-grid">
        <div className="field">
          <span className="field__label">Data e hora início</span>
          <div className="datetime-row">
            <input className="input" disabled={disabled} name="start_date" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
            <input className="input" disabled={disabled} name="start_time" onChange={(event) => setStartTime(event.target.value)} type="time" value={startTime} />
          </div>
        </div>
        <div className="field">
          <span className="field__label">Data e hora fim</span>
          <div className="datetime-row">
            <input className="input" disabled={disabled} name="end_date" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
            <input className="input" disabled={disabled} name="end_time" onChange={(event) => setEndTime(event.target.value)} type="time" value={endTime} />
          </div>
        </div>
      </div>
      <section className="selection-panel">
        <h3>Alertas do Evento</h3>
        {isManager ? (
          <>
            <p>Permite configurar até dois lembretes automáticos calculados com base na data e hora de início.</p>
            <SelectField
              disabled={disabled}
              label="Alerta"
              name="alert"
              onChange={(event) => setPrimaryAlert(normalizeEventAlert(event.target.value))}
              value={primaryAlert}
            >
              {eventAlertOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
            {primaryAlert !== 'none' ? (
              <SelectField disabled={disabled} label="Segundo Alerta" name="second_alert" onChange={(event) => setSecondaryAlert(normalizeEventAlert(event.target.value))} value={secondaryAlert}>
                {eventAlertOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
            ) : null}
          </>
        ) : (
          <div className="plain-list plain-list--unstyled">
            {event.alerts && event.alerts.length > 0 ? event.alerts.map((alert) => <span key={alert}>{eventAlertLabel(alert)}</span>) : <span>Nenhum alerta configurado</span>}
          </div>
        )}
      </section>
      <section className="selection-panel">
        <div className="selection-panel__header">
          <div>
            <h3>Repertórios vinculados</h3>
            <p>Selecione os repertórios que serão executados neste evento. As músicas, kits e partituras seguem o repertório.</p>
          </div>
          {isManager ? <Button onClick={() => onStartRelatedCreate('repertoire', currentDraft())} size="sm" variant="quiet">Cadastrar novo repertório</Button> : null}
        </div>
        {repertoires.length > 0 ? (
          <div className="check-list">
            {repertoires.map((repertoire) => {
              const songTitles = repertoire.songs
                .slice()
                .sort((a, b) => a.execution_order - b.execution_order)
                .map((entry) => songs.find((song) => song.id === entry.song_id)?.title)
                .filter((titleValue): titleValue is string => Boolean(titleValue))
              return (
                <label className="check-row" key={repertoire.id}>
                  <input checked={selectedRepertoireIDs.includes(repertoire.id)} disabled={disabled} onChange={() => setSelectedRepertoireIDs((current) => toggleID(current, repertoire.id))} type="checkbox" />
                  <span>
                    <strong>{repertoire.name}</strong>
                    <small>{songTitles.length ? `${songTitles.length} música(s): ${songTitles.join(', ')}` : 'Sem músicas'}</small>
                  </span>
                </label>
              )
            })}
          </div>
        ) : (
          <small>Nenhum repertório cadastrado para este coral.</small>
        )}
      </section>
      <Field disabled={disabled} label="Local" name="location" onChange={(event) => setLocation(event.target.value)} value={location} />
      <Field disabled={disabled} label="Endereço" name="address" onChange={(event) => setAddress(event.target.value)} value={address} />
      <Field disabled={disabled} label="Link do Google Maps" name="maps_url" onChange={(event) => setMapsUrl(event.target.value)} value={mapsUrl} />
      <Field disabled={disabled} label="Observações" name="description" onChange={(event) => setDescription(event.target.value)} value={description} />
      <div className="readonly-field">
        <span>Status</span>
        <Badge tone={eventStatusTone(event.status)}>{eventStatusLabel(event.status)}</Badge>
      </div>
      <div className="quick-actions">
        <Button icon={<MapPin className="button__icon" size={16} />} variant="secondary">Abrir rota</Button>
        <Button variant="quiet">Adicionar ao calendário</Button>
        <Button variant="quiet">Compartilhar</Button>
      </div>
      {isManager ? (
        <div className="quick-actions">
          <Button type="submit" variant="primary">{isNew ? 'Salvar evento' : 'Salvar alterações'}</Button>
          {!isNew && event.status === 'active' ? <Button onClick={() => onSave({ ...event, status: 'canceled' })} variant="secondary">Cancelar evento</Button> : null}
          {!isNew && event.status === 'canceled' ? <Button onClick={() => onSave({ ...event, status: 'active' })} variant="secondary">Reativar evento</Button> : null}
          {!isNew && event.status === 'finished' ? <Button onClick={() => onSave({ ...event, id: newID('event'), title: `${event.title} (cópia)`, status: 'active' })} variant="secondary">Repetir evento</Button> : null}
          {!isNew ? <Button variant="danger">Excluir</Button> : null}
        </div>
      ) : null}
    </form>
  )
}

function InstrumentsView({
  instruments,
  isManager,
  onBackFromDetail,
  materials,
  onDeleteInstrument,
  onSaveInstrument,
  selectedInstrumentID,
  setSelectedInstrumentID,
  users,
}: {
  instruments: Instrument[]
  isManager: boolean
  materials: Material[]
  onBackFromDetail: () => void
  onDeleteInstrument: (instrumentID: string) => void
  onSaveInstrument: (instrument: Instrument) => void
  selectedInstrumentID: string | null
  setSelectedInstrumentID: (instrumentID: string | null) => void
  users: User[]
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('name-asc')
  const selectableUsers = users.filter((user) => user.access_role === 'conductor' || user.access_role === 'instrumentalist')
  const selectedInstrument = selectedInstrumentID === 'new' ? blankInstrument() : instruments.find((instrument) => instrument.id === selectedInstrumentID)
  const visibleInstruments = instruments
    .filter((instrument) => instrument.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sortInstruments(a, b, sort))

  if (!isManager) {
    return <EmptyState icon={<Music2 size={22} />} title="Acesso restrito" body="A gestão de instrumentos está disponível apenas para usuários gestores." />
  }

  if (selectedInstrument) {
    return (
      <InstrumentDetail
        instrument={selectedInstrument}
        isNew={selectedInstrumentID === 'new'}
        materials={materials.filter((material) => material.instrument_ids.includes(selectedInstrument.id))}
        onBack={onBackFromDetail}
        onDelete={onDeleteInstrument}
        onSave={onSaveInstrument}
        users={selectableUsers}
      />
    )
  }

  return (
    <div className="view-stack">
      <section className="panel">
        <SectionTitle eyebrow="Cadastro mestre" title="Gerencie os instrumentos utilizados pelo coral." />
        <div className="toolbar">
          <div className="search-box">
            <Search size={16} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar instrumento" value={query} />
          </div>
          <SelectField label="Ordenar por" onChange={(event) => setSort(event.target.value)} value={sort}>
            <option value="name-asc">Nome A-Z</option>
            <option value="name-desc">Nome Z-A</option>
            <option value="most-used">Mais utilizados</option>
            <option value="least-used">Menos utilizados</option>
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
          </SelectField>
          <Button icon={<Plus className="button__icon" size={16} />} onClick={() => setSelectedInstrumentID('new')} variant="primary">Novo</Button>
        </div>
      </section>

      {visibleInstruments.length === 0 ? (
        <EmptyState icon={<Music2 size={22} />} title="Nenhum instrumento cadastrado" body="Cadastre o primeiro instrumento para começar." />
      ) : (
        <section className="instrument-grid">
          {visibleInstruments.map((instrument) => {
            const linkedUsers = users.filter((user) => instrument.user_ids.includes(user.id))
            const linkedMaterials = materials.filter((material) => material.instrument_ids.includes(instrument.id))
            return (
              <button className={`instrument-card instrument-card--button ${instrument.archived ? 'is-inactive' : ''}`} key={instrument.id} onClick={() => setSelectedInstrumentID(instrument.id)} type="button">
                <div className="instrument-card__heading">
                  <span className="instrument-icon">{instrument.icon ?? '🎼'}</span>
                  <div>
                    <h3>{instrument.name}</h3>
                    <p>{instrument.description ?? 'Sem descrição'}</p>
                  </div>
                </div>
                <div className="focus-list">
                  <div><span>Usuários vinculados</span><strong>{linkedUsers.length}</strong></div>
                  <div><span>Materiais vinculados</span><strong>{linkedMaterials.length}</strong></div>
                </div>
                <div className="avatar-stack" aria-label="Usuários vinculados">
                  {linkedUsers.slice(0, 3).map((user) => <span className="avatar avatar--small" key={user.id}>{initials(user.full_name)}</span>)}
                  {linkedUsers.length > 3 ? <span className="avatar avatar--small">+{linkedUsers.length - 3}</span> : null}
                </div>
                <small>{linkedUsers.map((user) => user.full_name).slice(0, 2).join(', ') || 'Nenhum usuário vinculado'}</small>
                <small>Criado em: {formatDate(instrument.created_at)}</small>
                <Badge tone={instrument.archived ? 'neutral' : 'green'}>{instrument.archived ? 'Arquivado' : 'Ativo'}</Badge>
              </button>
            )
          })}
        </section>
      )}
    </div>
  )
}

function InstrumentDetail({
  instrument,
  isNew,
  materials,
  onBack,
  onDelete,
  onSave,
  users,
}: {
  instrument: Instrument
  isNew: boolean
  materials: Material[]
  onBack: () => void
  onDelete: (instrumentID: string) => void
  onSave: (instrument: Instrument) => void
  users: User[]
}) {
  const [deleteMessage, setDeleteMessage] = useState('')
  const hasLinks = instrument.user_ids.length > 0 || materials.length > 0

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSave({
      ...instrument,
      name: formString(form, 'name') || instrument.name,
      description: optionalText(formString(form, 'description')),
      icon: formString(form, 'icon') || undefined,
      user_ids: form.getAll('user_ids').map(String),
      updated_at: new Date().toISOString(),
    })
  }

  function tryDelete() {
    if (hasLinks) {
      setDeleteMessage('Não é possível excluir este instrumento porque existem usuários ou materiais vinculados. Remova os vínculos antes de prosseguir.')
      return
    }
    onDelete(instrument.id)
  }

  return (
    <form className="detail-form" onSubmit={submit}>
      <SectionTitle eyebrow="Instrumento" title={isNew ? 'Cadastrar instrumento' : instrument.name} action={<Button onClick={onBack} variant="quiet">Voltar</Button>} />
      <Field defaultValue={instrument.name} label="Nome" name="name" placeholder="Violino" />
      <Field defaultValue={instrument.description} label="Descrição" name="description" placeholder="Instrumento utilizado pelo naipe de cordas" />
      <SelectField defaultValue={instrument.icon ?? '🎼'} label="Ícone" name="icon">
        <option value="🎻">🎻 Violino</option>
        <option value="🎹">🎹 Piano</option>
        <option value="🎺">🎺 Trompete</option>
        <option value="🥁">🥁 Percussão</option>
        <option value="🎸">🎸 Violão</option>
        <option value="🎼">🎼 Outro</option>
      </SelectField>
      <div className="readonly-field">
        <span>Status</span>
        <div className="chip-list">
          <Badge tone={instrument.archived ? 'neutral' : 'green'}>{instrument.archived ? 'Arquivado' : 'Ativo'}</Badge>
          <Badge tone={hasLinks ? 'blue' : 'neutral'}>{hasLinks ? 'Em uso' : 'Sem vínculos'}</Badge>
        </div>
      </div>

      <section className="selection-panel">
        <h3>Usuários vinculados</h3>
        <div className="chip-list">
          {users.filter((user) => instrument.user_ids.includes(user.id)).map((user) => <Badge key={user.id} tone="blue">{user.full_name}</Badge>)}
        </div>
        <div className="check-list">
          {users.map((user) => (
            <label className="check-row" key={user.id}>
              <input defaultChecked={instrument.user_ids.includes(user.id)} name="user_ids" type="checkbox" value={user.id} />
              <span>
                <strong>{user.full_name}</strong>
                <small>{accessRoleLabel(user.access_role)}</small>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="selection-panel">
        <h3>Materiais vinculados</h3>
        {materials.length > 0 ? (
          <div className="chip-list">
            {materials.map((material) => <Badge key={material.id} tone="gold">{material.name}</Badge>)}
          </div>
        ) : (
          <small>O vínculo de partituras é feito na tela da música, ao marcar o instrumento como destino.</small>
        )}
      </section>

      {!isNew ? (
        <section className="metadata-grid">
          <div><span>Criado em</span><strong>{formatDate(instrument.created_at)}</strong></div>
          <div><span>Última atualização</span><strong>{formatDate(instrument.updated_at)}</strong></div>
        </section>
      ) : null}

      <div className="quick-actions">
        <Button type="submit" variant="primary">{isNew ? 'Salvar instrumento' : 'Salvar alterações'}</Button>
        {!isNew ? <Button onClick={() => onSave({ ...instrument, archived: !instrument.archived, updated_at: new Date().toISOString() })} variant="secondary">{instrument.archived ? 'Reativar' : 'Arquivar'}</Button> : null}
        {!isNew ? <Button onClick={tryDelete} variant="danger">Excluir</Button> : null}
      </div>
      {deleteMessage ? <p className="form-error">{deleteMessage}</p> : null}
    </form>
  )
}

function RepertoiresView({
  choirID,
  events,
  isManager,
  isRelatedCreate,
  onBackFromDetail,
  onDeleteRepertoire,
  onSaveRepertoire,
  repertoires,
  selectedRepertoireID,
  setSelectedRepertoireID,
  songs,
  tenantID,
}: {
  choirID: string
  events: EventItem[]
  isManager: boolean
  isRelatedCreate: boolean
  onBackFromDetail: () => void
  onDeleteRepertoire: (repertoireID: string) => void
  onSaveRepertoire: (repertoire: Repertoire) => void
  repertoires: Repertoire[]
  selectedRepertoireID: string | null
  setSelectedRepertoireID: (repertoireID: string | null) => void
  songs: Song[]
  tenantID: string
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('name-asc')
  const selectedRepertoire = selectedRepertoireID === 'new' ? blankRepertoire(tenantID, choirID) : repertoires.find((repertoire) => repertoire.id === selectedRepertoireID)
  const visibleRepertoires = repertoires
    .filter((repertoire) => repertoire.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (sort === 'name-desc' ? b.name.localeCompare(a.name) : sort === 'newest' ? new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime() : a.name.localeCompare(b.name)))

  if (selectedRepertoire) {
    return (
      <RepertoireDetail
        events={events.filter((event) => event.linked_repertoire_ids?.includes(selectedRepertoire.id))}
        isManager={isManager}
        isNew={selectedRepertoireID === 'new'}
        isRelatedCreate={isRelatedCreate}
        onBack={onBackFromDetail}
        onDelete={onDeleteRepertoire}
        onSave={onSaveRepertoire}
        repertoire={selectedRepertoire}
        songs={songs.filter((song) => song.choir_id === selectedRepertoire.choir_id)}
      />
    )
  }

  return (
    <div className="view-stack">
      <section className="panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={16} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar repertório" value={query} />
          </div>
          <SelectField label="Ordenar por" onChange={(event) => setSort(event.target.value)} value={sort}>
            <option value="name-asc">Nome A-Z</option>
            <option value="name-desc">Nome Z-A</option>
            <option value="newest">Mais recente</option>
          </SelectField>
          {isManager ? <Button icon={<Plus className="button__icon" size={16} />} onClick={() => setSelectedRepertoireID('new')} variant="primary">Novo repertório</Button> : null}
        </div>
      </section>
      {visibleRepertoires.length === 0 ? (
        <EmptyState icon={<Library size={22} />} title="Nenhum repertório cadastrado" body="Crie um repertório para agrupar músicas e vinculá-lo a eventos." />
      ) : (
        <section className="kit-grid">
          {visibleRepertoires.map((repertoire) => {
            const linkedEvents = events.filter((event) => event.linked_repertoire_ids?.includes(repertoire.id))
            return (
              <button className={`kit-card kit-card--button ${repertoire.archived ? 'is-archived' : ''}`} key={repertoire.id} onClick={() => setSelectedRepertoireID(repertoire.id)} type="button">
                <div className="kit-card__heading">
                  <span className="entity-row__icon"><Library size={18} /></span>
                  <div>
                    <h3>{repertoire.name}</h3>
                    <p>{repertoire.description ?? 'Sem descrição'}</p>
                  </div>
                </div>
                <small>Músicas: {repertoire.songs.length} · Eventos: {linkedEvents.length}</small>
                <Badge tone={repertoire.archived ? 'neutral' : 'green'}>{repertoire.archived ? 'Arquivado' : 'Ativo'}</Badge>
              </button>
            )
          })}
        </section>
      )}
    </div>
  )
}

function RepertoireDetail({
  events,
  isManager,
  isNew,
  isRelatedCreate,
  onBack,
  onDelete,
  onSave,
  repertoire,
  songs,
}: {
  events: EventItem[]
  isManager: boolean
  isNew: boolean
  isRelatedCreate: boolean
  onBack: () => void
  onDelete: (repertoireID: string) => void
  onSave: (repertoire: Repertoire) => void
  repertoire: Repertoire
  songs: Song[]
}) {
  const disabled = !isManager
  const [entries, setEntries] = useState<RepertoireSong[]>(() => repertoire.songs.slice().sort((a, b) => a.execution_order - b.execution_order))
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const availableSongs = songs.filter((song) => !song.archived && !entries.some((entry) => entry.song_id === song.id))

  function addSong(songID: string) {
    setEntries((current) => (current.some((entry) => entry.song_id === songID) ? current : [...current, { song_id: songID, execution_order: current.length + 1 }]))
  }

  function removeSong(songID: string) {
    setEntries((current) => current.filter((entry) => entry.song_id !== songID))
  }

  function dropAt(index: number) {
    setEntries((current) => {
      if (dragIndex === null || dragIndex === index) {
        return current
      }
      const next = current.slice()
      const [moved] = next.splice(dragIndex, 1)
      next.splice(index, 0, moved)
      return next
    })
    setDragIndex(null)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSave({
      ...repertoire,
      name: formString(form, 'name') || repertoire.name,
      description: optionalText(formString(form, 'description')),
      songs: entries.map((entry, index) => ({ ...entry, execution_order: index + 1 })),
      updated_at: new Date().toISOString(),
    })
  }

  return (
    <form className="detail-form" onSubmit={submit}>
      <SectionTitle eyebrow="Repertório" title={isNew ? 'Cadastrar repertório' : repertoire.name} action={<Button onClick={onBack} variant="quiet">{isRelatedCreate ? 'Voltar ao evento' : 'Voltar'}</Button>} />
      <Field defaultValue={repertoire.name} disabled={disabled} label="Nome" name="name" placeholder="Repertório Natal 2026" />
      <Field defaultValue={repertoire.description} disabled={disabled} label="Descrição" name="description" />
      <div className="readonly-field">
        <span>Status</span>
        <Badge tone={repertoire.archived ? 'neutral' : 'green'}>{repertoire.archived ? 'Arquivado' : 'Ativo'}</Badge>
      </div>
      <section className="selection-panel">
        <div className="selection-panel__header">
          <div>
            <h3>Músicas do repertório</h3>
            <p>Arraste para reordenar a sequência de execução.</p>
          </div>
        </div>
        {entries.length > 0 ? (
          <div className="order-list">
            {entries.map((entry, index) => {
              const song = songs.find((item) => item.id === entry.song_id)
              return (
                <div
                  className={`order-row ${dragIndex === index ? 'is-dragging' : ''}`}
                  draggable={!disabled}
                  key={entry.song_id}
                  onDragEnd={() => setDragIndex(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDragStart={() => setDragIndex(index)}
                  onDrop={() => dropAt(index)}
                >
                  <span className="order-row__handle"><GripVertical size={16} /></span>
                  <span className="order-row__index">{index + 1}</span>
                  <span className="order-row__title">
                    <strong>{song?.title ?? 'Música'}</strong>
                    <small>{song?.composer ?? 'Compositor não informado'}</small>
                  </span>
                  {!disabled ? <Button onClick={() => removeSong(entry.song_id)} size="sm" variant="quiet">Remover</Button> : null}
                </div>
              )
            })}
          </div>
        ) : (
          <small>Nenhuma música neste repertório ainda.</small>
        )}
        {!disabled && availableSongs.length > 0 ? (
          <SelectField label="Adicionar música" onChange={(event) => { if (event.target.value) { addSong(event.target.value) } }} value="">
            <option value="">Selecione uma música</option>
            {availableSongs.map((song) => <option key={song.id} value={song.id}>{song.title}</option>)}
          </SelectField>
        ) : null}
      </section>
      <section className="selection-panel">
        <h3>Eventos que usam este repertório</h3>
        {events.length > 0 ? (
          <div className="chip-list">
            {events.map((event) => <Badge key={event.id} tone="blue">{event.title}</Badge>)}
          </div>
        ) : (
          <small>Nenhum evento utiliza este repertório.</small>
        )}
      </section>
      {isManager ? (
        <div className="quick-actions">
          <Button type="submit" variant="primary">{isNew ? 'Salvar repertório' : 'Salvar alterações'}</Button>
          {!isNew ? <Button onClick={() => onSave({ ...repertoire, archived: !repertoire.archived, updated_at: new Date().toISOString() })} variant="secondary">{repertoire.archived ? 'Desarquivar' : 'Arquivar'}</Button> : null}
          {!isNew ? <Button onClick={() => onDelete(repertoire.id)} variant="danger">Excluir</Button> : null}
        </div>
      ) : null}
    </form>
  )
}

function UsersView({
  onBackFromDetail,
  onSaveUser,
  selectedUserID,
  setSelectedUserID,
  tenantID,
  users,
}: {
  onBackFromDetail: () => void
  onSaveUser: (user: User) => void
  selectedUserID: string | null
  setSelectedUserID: (userID: string | null) => void
  tenantID: string
  users: User[]
}) {
  const [query, setQuery] = useState('')
  const selectedUser = selectedUserID === 'new' ? blankUser(tenantID) : users.find((user) => user.id === selectedUserID)
  const visibleUsers = users.filter((user) => `${user.full_name} ${user.email}`.toLowerCase().includes(query.toLowerCase()))

  if (selectedUser) {
    return <UserDetail isNew={selectedUserID === 'new'} onBack={onBackFromDetail} onSave={onSaveUser} user={selectedUser} />
  }

  return (
    <div className="view-stack">
      <section className="panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={16} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar usuário" value={query} />
          </div>
          <Button icon={<Plus className="button__icon" size={16} />} onClick={() => setSelectedUserID('new')} variant="primary">Novo</Button>
        </div>
      </section>
      <section className="entity-list">
        {visibleUsers.map((user) => (
          <button className="entity-row" key={user.id} onClick={() => setSelectedUserID(user.id)} type="button">
            <span className="avatar">{initials(user.full_name)}</span>
            <span>
              <strong>{user.full_name}</strong>
              <small>{user.email} · {accessRoleLabel(user.access_role)} · {user.voice_type ? voiceLabels[user.voice_type] : 'Sem tipo de voz'} {user.manager ? '· Gestor' : ''}</small>
            </span>
            <Badge tone={user.active ? 'green' : 'neutral'}>{user.active ? 'Ativo' : 'Inativo'}</Badge>
          </button>
        ))}
      </section>
    </div>
  )
}

function UserDetail({ isNew, onBack, onSave, user }: { isNew: boolean; onBack: () => void; onSave: (user: User) => void; user: User }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSave({
      ...user,
      full_name: formString(form, 'full_name') || user.full_name,
      email: formString(form, 'email') || user.email,
      access_role: formString(form, 'access_role') as User['access_role'],
      voice_type: optionalVoiceType(formString(form, 'voice_type')),
      manager: formString(form, 'manager') === 'true',
    })
  }

  return (
    <form className="detail-form" onSubmit={submit}>
      <SectionTitle eyebrow="Usuário" title={isNew ? 'Cadastrar usuário' : user.full_name} action={<Button onClick={onBack} variant="quiet">Voltar</Button>} />
      <Field defaultValue={user.full_name} label="Nome" name="full_name" />
      <Field defaultValue={user.email} label="E-mail" name="email" type="email" />
      <SelectField defaultValue={user.access_role} label="Papel de acesso" name="access_role">
        <option value="singer">Corista</option>
        <option value="conductor">Regente</option>
        <option value="instrumentalist">Instrumentista</option>
      </SelectField>
      <SelectField defaultValue={user.manager ? 'true' : 'false'} label="Usuário gestor?" name="manager">
        <option value="false">Não</option>
        <option value="true">Sim</option>
      </SelectField>
      <SelectField defaultValue={user.voice_type ?? ''} label="Tipo de voz" name="voice_type">
        <option value="">Sem tipo de voz</option>
        <option value="soprano">Soprano</option>
        <option value="contralto">Contralto</option>
        <option value="tenor">Tenor</option>
        <option value="baixo">Baixo</option>
      </SelectField>
      <div className="readonly-field">
        <span>Status</span>
        <Badge tone={user.active ? 'green' : 'neutral'}>{user.active ? 'Ativo' : 'Inativo'}</Badge>
      </div>
      <div className="quick-actions">
        <Button type="submit" variant="primary">{isNew ? 'Salvar e enviar convite' : 'Salvar alterações'}</Button>
        {!isNew ? <Button onClick={() => onSave({ ...user, active: !user.active })} variant={user.active ? 'secondary' : 'quiet'}>{user.active ? 'Desativar' : 'Ativar'}</Button> : null}
      </div>
      {!isNew ? <section className="danger-zone">
        <h3>Zona de perigo</h3>
        <Button variant="danger">Excluir usuário</Button>
      </section> : null}
    </form>
  )
}

function ProfileView({ user }: { user: User }) {
  return (
    <form className="detail-form">
      <SectionTitle eyebrow="Meu perfil" title={user.full_name} />
      <div className="profile-summary">
        <span className="avatar avatar--large">{initials(user.full_name)}</span>
        <div>
          <strong>{accessRoleLabel(user.access_role)}</strong>
          <p>{user.voice_type ? voiceLabels[user.voice_type] : user.instruments?.join(', ') || 'Sem vínculo musical'}</p>
        </div>
      </div>
      <Field defaultValue={user.full_name} label="Nome" />
      <Field defaultValue={user.email} label="E-mail" />
      <SelectField defaultValue={user.voice_type ?? ''} label="Tipo de voz">
        <option value="">Sem tipo de voz</option>
        <option value="soprano">Soprano</option>
        <option value="contralto">Contralto</option>
        <option value="tenor">Tenor</option>
        <option value="baixo">Baixo</option>
      </SelectField>
      <Button variant="secondary">Alterar senha</Button>
    </form>
  )
}

function CalendarCompact({
  events,
  onSelectDate,
  selectedDate,
  setSelectedDate,
}: {
  events: EventItem[]
  onSelectDate?: (date: Date) => void
  selectedDate: Date
  setSelectedDate: (date: Date) => void
}) {
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  const days = Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() }, (_, index) => index + 1)
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(selectedDate)
  const chooseDate = onSelectDate ?? setSelectedDate

  function moveMonth(offset: number) {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + offset, 1))
  }

  return (
    <div className="calendar-compact">
      <div className="calendar-compact__header">
        <IconButton label="Mês anterior" onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></IconButton>
        <strong>{monthLabel}</strong>
        <div>
          <Button onClick={() => chooseDate(new Date())} size="sm" variant="quiet">Hoje</Button>
          <IconButton label="Próximo mês" onClick={() => moveMonth(1)}><ChevronRight size={16} /></IconButton>
        </div>
      </div>
      <div className="calendar-grid">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => <span className="calendar-weekday" key={`${day}-${index}`}>{day}</span>)}
        {Array.from({ length: monthStart.getDay() }, (_, index) => <span key={`blank-${index}`} />)}
        {days.map((day) => {
          const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day)
          const dayEvents = events.filter((event) => sameDay(new Date(event.start_at), date))
          return (
            <button className={`calendar-day ${sameDay(date, selectedDate) ? 'is-selected' : ''}`} key={day} onClick={() => chooseDate(date)} type="button">
              {day}
              {dayEvents.length > 0 ? <span>{dayEvents.some((event) => event.event_type === 'presentation') ? '★' : '●'}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FilterPanel({
  customEnd,
  customStart,
  hasActiveFilters,
  onClearFilters,
  periodFilter,
  setCustomEnd,
  setCustomStart,
  setPeriodFilter,
  setStatusFilter,
  setTypeFilter,
  statusFilter,
  typeFilter,
}: {
  customEnd: string
  customStart: string
  hasActiveFilters: boolean
  onClearFilters: () => void
  periodFilter: AgendaPeriodFilter
  setCustomEnd: (value: string) => void
  setCustomStart: (value: string) => void
  setPeriodFilter: (value: AgendaPeriodFilter) => void
  setStatusFilter: (value: AgendaStatusFilter) => void
  setTypeFilter: (value: AgendaTypeFilter) => void
  statusFilter: AgendaStatusFilter
  typeFilter: AgendaTypeFilter
}) {
  return (
    <div className="filter-panel">
      <div className="filter-panel__header">
        <span>Filtros da agenda</span>
        <Button disabled={!hasActiveFilters} onClick={onClearFilters} size="sm" variant="quiet">Limpar</Button>
      </div>

      <div className="filter-group">
        <strong>Período</strong>
        <div className="filter-options">
          <FilterChip active={periodFilter === 'calendar'} onClick={() => setPeriodFilter('calendar')}>Data selecionada</FilterChip>
          <FilterChip active={periodFilter === 'today'} onClick={() => setPeriodFilter('today')}>Hoje</FilterChip>
          <FilterChip active={periodFilter === 'next7'} onClick={() => setPeriodFilter('next7')}>Próximos 7 dias</FilterChip>
          <FilterChip active={periodFilter === 'next30'} onClick={() => setPeriodFilter('next30')}>Próximos 30 dias</FilterChip>
          <FilterChip active={periodFilter === 'custom'} onClick={() => setPeriodFilter('custom')}>Período exato</FilterChip>
        </div>
        {periodFilter === 'custom' ? (
          <div className="custom-period">
            <Field
              inputMode="numeric"
              label="De"
              maxLength={10}
              onChange={(event) => setCustomStart(formatBrazilianDateInput(event.target.value, customStart))}
              placeholder="dd/mm/aaaa"
              value={customStart}
            />
            <Field
              inputMode="numeric"
              label="Até"
              maxLength={10}
              onChange={(event) => setCustomEnd(formatBrazilianDateInput(event.target.value, customEnd))}
              placeholder="dd/mm/aaaa"
              value={customEnd}
            />
          </div>
        ) : null}
      </div>

      <div className="filter-group">
        <strong>Tipo de evento</strong>
        <div className="filter-options">
          <FilterChip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>Todos</FilterChip>
          <FilterChip active={typeFilter === 'rehearsal'} onClick={() => setTypeFilter('rehearsal')}>Ensaio</FilterChip>
          <FilterChip active={typeFilter === 'presentation'} onClick={() => setTypeFilter('presentation')}>Apresentação</FilterChip>
          <FilterChip active={typeFilter === 'other'} onClick={() => setTypeFilter('other')}>Outro</FilterChip>
        </div>
      </div>

      <div className="filter-group">
        <strong>Situação</strong>
        <div className="filter-options">
          <FilterChip active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>Ativos</FilterChip>
          <FilterChip active={statusFilter === 'canceled'} onClick={() => setStatusFilter('canceled')}>Cancelados</FilterChip>
          <FilterChip active={statusFilter === 'finished'} onClick={() => setStatusFilter('finished')}>Encerrados</FilterChip>
          <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Todos</FilterChip>
        </div>
      </div>
    </div>
  )
}

function FilterChip({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button className={`filter-chip ${active ? 'is-active' : ''}`} onClick={onClick} type="button">
      {children}
    </button>
  )
}

function enrichData(result: AppData, session: Session): AppData {
  const users = result.users.map((user) => user.id === session.user.id ? { ...user, ...session.user } : user)
  return { ...result, users }
}

function readStoredSession(): Session | null {
  const stored = localStorage.getItem('coralhub-session')
  if (!stored) {
    return null
  }
  try {
    return JSON.parse(stored) as Session
  } catch {
    localStorage.removeItem('coralhub-session')
    return null
  }
}

function pageTitle(view: ViewKey) {
  const labels: Record<ViewKey, string> = {
    home: 'Início',
    agenda: 'Agenda do coral',
    repertoires: 'Repertórios',
    songs: 'Músicas',
    instruments: 'Instrumentos',
    users: 'Gestão de usuários',
    profile: 'Meu perfil',
  }
  return labels[view]
}

function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem('coralhub-theme')
  if (stored === 'light' || stored === 'dark') {
    return stored
  }
  return 'light'
}

function initials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function byStartAt(a: EventItem, b: EventItem) {
  return new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function endOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999)
}

function addDays(value: Date, days: number) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

function parseBrazilianDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) {
    return undefined
  }

  const [, dayValue, monthValue, yearValue] = match
  const day = Number(dayValue)
  const month = Number(monthValue)
  const year = Number(yearValue)
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined
  }

  return date
}

function formatBrazilianDateInput(value: string, previousValue: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)

  if (digits === '') {
    return ''
  }

  if (!isValidBrazilianDateDigits(digits)) {
    return previousValue
  }

  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean)
  return parts.join('/')
}

function isValidBrazilianDateDigits(digits: string) {
  const dayPrefix = digits.slice(0, 1)
  if (dayPrefix && Number(dayPrefix) > 3) {
    return false
  }

  if (digits.length >= 2) {
    const day = Number(digits.slice(0, 2))
    if (day < 1 || day > 31) {
      return false
    }
  }

  const monthPrefix = digits.slice(2, 3)
  if (monthPrefix && Number(monthPrefix) > 1) {
    return false
  }

  if (digits.length >= 4) {
    const month = Number(digits.slice(2, 4))
    if (month < 1 || month > 12) {
      return false
    }
  }

  if (digits.length === 8) {
    const formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
    return Boolean(parseBrazilianDate(formatted))
  }

  return true
}

function formatBrazilianDate(value: Date) {
  return value.toLocaleDateString('pt-BR')
}

function getAgendaPeriodRange(period: AgendaPeriodFilter, selectedDate: Date, customStart: string, customEnd: string): AgendaDateRange {
  const today = startOfDay(new Date())

  if (period === 'today') {
    return { from: today, to: endOfDay(today) }
  }

  if (period === 'next7') {
    return { from: today, to: endOfDay(addDays(today, 7)) }
  }

  if (period === 'next30') {
    return { from: today, to: endOfDay(addDays(today, 30)) }
  }

  if (period === 'custom') {
    const from = parseBrazilianDate(customStart)
    const to = parseBrazilianDate(customEnd)
    return {
      from: from ? startOfDay(from) : undefined,
      to: to ? endOfDay(to) : undefined,
    }
  }

  return { from: startOfDay(selectedDate) }
}

function eventOverlapsRange(event: EventItem, range: AgendaDateRange) {
  const eventStart = new Date(event.start_at).getTime()
  const eventEnd = new Date(event.end_at ?? event.start_at).getTime()

  if (range.from && eventEnd < range.from.getTime()) {
    return false
  }

  if (range.to && eventStart > range.to.getTime()) {
    return false
  }

  return true
}

function agendaPeriodLabel(period: AgendaPeriodFilter, selectedDate: Date, customStart: string, customEnd: string) {
  if (period === 'today') {
    return 'Hoje'
  }
  if (period === 'next7') {
    return 'Próximos 7 dias'
  }
  if (period === 'next30') {
    return 'Próximos 30 dias'
  }
  if (period === 'custom') {
    const from = parseBrazilianDate(customStart)
    const to = parseBrazilianDate(customEnd)
    if (from && to) {
      return `${formatBrazilianDate(from)} a ${formatBrazilianDate(to)}`
    }
    if (from) {
      return `A partir de ${formatBrazilianDate(from)}`
    }
    if (to) {
      return `Até ${formatBrazilianDate(to)}`
    }
    return 'Período exato'
  }
  return `A partir de ${formatBrazilianDate(selectedDate)}`
}

function accessRoleLabel(value?: string) {
  const labels: Record<string, string> = {
    singer: 'Corista',
    conductor: 'Regente',
    instrumentalist: 'Instrumentista',
  }
  return labels[value ?? ''] ?? 'Corista'
}

function sortInstruments(a: Instrument, b: Instrument, sort: string) {
  if (sort === 'name-desc') {
    return b.name.localeCompare(a.name)
  }
  if (sort === 'most-used') {
    return b.user_ids.length - a.user_ids.length
  }
  if (sort === 'least-used') {
    return a.user_ids.length - b.user_ids.length
  }
  if (sort === 'newest') {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }
  if (sort === 'oldest') {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  }
  return a.name.localeCompare(b.name)
}

function upsertByID<T extends { id: string }>(items: T[], item: T) {
  if (items.some((current) => current.id === item.id)) {
    return items.map((current) => current.id === item.id ? item : current)
  }
  return [item, ...items]
}

function addUniqueID(items: string[], id: string) {
  return items.includes(id) ? items : [...items, id]
}

function toggleID(items: string[], id: string) {
  return items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
}

function blankUser(tenantID: string): User {
  return {
    id: newID('user'),
    tenant_id: tenantID,
    email: '',
    full_name: '',
    access_role: 'singer',
    voice_type: undefined,
    manager: false,
    active: true,
  }
}

function blankRepertoire(tenantID: string, choirID: string): Repertoire {
  return {
    id: newID('repertoire'),
    tenant_id: tenantID,
    choir_id: choirID,
    name: '',
    description: '',
    songs: [],
    archived: false,
    updated_at: new Date().toISOString(),
  }
}

function blankEvent(tenantID: string, choirID: string): EventItem {
  const startAt = new Date()
  startAt.setDate(startAt.getDate() + 1)
  startAt.setMinutes(0, 0, 0)

  const endAt = new Date(startAt)
  endAt.setHours(endAt.getHours() + 2)

  return {
    id: newID('event'),
    tenant_id: tenantID,
    choir_id: choirID,
    title: '',
    description: '',
    event_type: 'rehearsal',
    location: '',
    address: '',
    maps_url: '',
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    status: 'active',
    linked_repertoire_ids: [],
    alerts: [],
    active: true,
  }
}

function blankInstrument(): Instrument {
  const now = new Date().toISOString()
  return {
    id: newID('instrument'),
    name: '',
    description: '',
    icon: '🎼',
    archived: false,
    user_ids: [],
    created_at: now,
    updated_at: now,
  }
}

function normalizeEventAlert(value: string): EventAlert {
  const match = eventAlertOptions.find((option) => option.value === value)
  return match?.value ?? 'none'
}

function eventAlertLabel(value: EventAlert) {
  return eventAlertOptions.find((option) => option.value === value)?.label ?? 'Nenhum'
}

function eventStatusLabel(value: EventItem['status']) {
  const labels: Record<string, string> = {
    active: 'Ativo',
    canceled: 'Cancelado',
    finished: 'Encerrado',
  }
  return labels[value ?? 'active'] ?? 'Ativo'
}

function eventStatusTone(value: EventItem['status']): 'green' | 'red' | 'neutral' {
  if (value === 'canceled') {
    return 'red'
  }
  if (value === 'finished') {
    return 'neutral'
  }
  return 'green'
}

function toLocalISO(value: string) {
  const date = new Date(value)
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString()
}

function toDateInput(value: string) {
  return toLocalISO(value).slice(0, 10)
}

function toTimeInput(value: string) {
  return toLocalISO(value).slice(11, 16)
}

export default App
