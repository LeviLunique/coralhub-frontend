import type { LucideIcon } from 'lucide-react'

export type ThemeMode = 'light' | 'dark'

export type ViewKey = 'home' | 'agenda' | 'repertoires' | 'songs' | 'instruments' | 'users' | 'profile'

export type TenantBootstrap = {
  slug: string
  display_name: string
  branding: {
    logo_url?: string
    primary_color?: string
    secondary_color?: string
    custom_domain?: string
  }
}

export type Choir = {
  id: string
  tenant_id: string
  name: string
  description?: string
  active: boolean
}

export type User = {
  id: string
  tenant_id: string
  email: string
  full_name: string
  access_role?: 'singer' | 'conductor' | 'instrumentalist'
  voice_type?: VoiceType
  instruments?: string[]
  manager?: boolean
  active: boolean
}

export type VoiceType = 'soprano' | 'contralto' | 'tenor' | 'baixo'

export type Membership = {
  id: string
  tenant_id: string
  choir_id: string
  user_id: string
  email?: string
  full_name?: string
  role: 'manager' | 'member' | string
  active: boolean
}

export type Song = {
  id: string
  tenant_id: string
  choir_id: string
  title: string
  composer?: string
  arranger?: string
  song_key?: string
  duration?: string
  notes?: string
  favorite: boolean
  archived: boolean
  created_at: string
  updated_at: string
}

export type MaterialType = 'audio_guide' | 'sheet_music' | 'playback' | 'lyrics' | 'other'

export type Material = {
  id: string
  tenant_id: string
  choir_id: string
  song_id: string
  name: string
  material_type: MaterialType
  target_type: 'voice' | 'instrument'
  voice_labels: string[]
  instrument_ids: string[]
  file_name?: string
  content_type?: string
  size_bytes?: number
  external_url?: string
  preview_url?: string
  archived: boolean
  updated_at: string
}

export type RepertoireSong = {
  song_id: string
  execution_order: number
  notes?: string
}

export type Repertoire = {
  id: string
  tenant_id: string
  choir_id: string
  name: string
  description?: string
  songs: RepertoireSong[]
  archived: boolean
  updated_at: string
}

export type Instrument = {
  id: string
  name: string
  description?: string
  icon?: string
  archived: boolean
  user_ids: string[]
  created_at: string
  updated_at: string
}

export type EventItem = {
  id: string
  tenant_id: string
  choir_id: string
  title: string
  description?: string
  event_type: 'rehearsal' | 'presentation' | 'other' | string
  location?: string
  address?: string
  maps_url?: string
  start_at: string
  end_at?: string
  status?: 'active' | 'canceled' | 'finished'
  linked_repertoire_ids?: string[]
  alerts?: EventAlert[]
  active: boolean
}

export type EventAlert =
  | 'none'
  | 'at_event_time'
  | 'five_minutes_before'
  | 'ten_minutes_before'
  | 'fifteen_minutes_before'
  | 'thirty_minutes_before'
  | 'one_hour_before'
  | 'two_hours_before'
  | 'one_day_before'
  | 'two_days_before'
  | 'one_week_before'

export type AppData = {
  tenant: TenantBootstrap
  choirs: Choir[]
  users: User[]
  memberships: Membership[]
  songs: Song[]
  repertoires: Repertoire[]
  materials: Material[]
  events: EventItem[]
  instruments: Instrument[]
}

export type RuntimeContext = {
  tenantSlug: string
  actorEmail: string
}

export type Session = {
  tenant: {
    id: string
    slug: string
    display_name: string
  }
  user: User
}

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export type NavItem = {
  key: ViewKey
  label: string
  icon: LucideIcon
}
