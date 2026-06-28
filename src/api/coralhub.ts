import type {
  AppData,
  Choir,
  EventItem,
  Membership,
  RuntimeContext,
  Session,
  TenantBootstrap,
  User,
} from '../types'

type CollectionResponse<T> = {
  items: T[]
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const defaultBaseURL = 'http://127.0.0.1:8080/api/v1'

export class CoralHubApi {
  private readonly baseURL: string

  constructor(baseURL = import.meta.env.VITE_CORALHUB_API_URL ?? defaultBaseURL) {
    this.baseURL = baseURL.replace(/\/$/, '')
  }

  async getBootstrap(tenantSlug: string): Promise<TenantBootstrap> {
    return this.request<TenantBootstrap>(`/public/tenants/${tenantSlug}`)
  }

  async login(input: { email: string; password: string }): Promise<Session> {
    return this.request<Session>('/auth/login', {
      method: 'POST',
      body: input,
    })
  }

  async listUsers(context: RuntimeContext): Promise<User[]> {
    const result = await this.request<CollectionResponse<User>>('/users/', { context })
    return result.items
  }

  async createUser(context: RuntimeContext, input: { email: string; full_name: string }): Promise<User> {
    return this.request<User>('/users/', {
      context,
      method: 'POST',
      body: input,
    })
  }

  async listChoirs(context: RuntimeContext): Promise<Choir[]> {
    const result = await this.request<CollectionResponse<Choir>>('/choirs/', { context })
    return result.items
  }

  async createChoir(context: RuntimeContext, input: { name: string; description?: string }): Promise<Choir> {
    return this.request<Choir>('/choirs/', {
      context,
      method: 'POST',
      body: input,
    })
  }

  async listMemberships(context: RuntimeContext, choirID: string): Promise<Membership[]> {
    const result = await this.request<CollectionResponse<Membership>>(`/choirs/${choirID}/memberships/`, { context })
    return result.items
  }

  async addMembership(
    context: RuntimeContext,
    choirID: string,
    input: { user_id: string; role: 'manager' | 'member' },
  ): Promise<Membership> {
    return this.request<Membership>(`/choirs/${choirID}/memberships/`, {
      context,
      method: 'POST',
      body: input,
    })
  }

  async listEvents(context: RuntimeContext, choirID: string): Promise<EventItem[]> {
    const result = await this.request<CollectionResponse<EventItem>>(`/choirs/${choirID}/events/`, { context })
    return result.items
  }

  async createEvent(
    context: RuntimeContext,
    choirID: string,
    input: {
      title: string
      event_type: 'rehearsal' | 'presentation' | 'other'
      start_at: string
      description?: string
      location?: string
    },
  ): Promise<EventItem> {
    return this.request<EventItem>(`/choirs/${choirID}/events/`, {
      context,
      method: 'POST',
      body: input,
    })
  }

  async loadDashboard(context: RuntimeContext): Promise<AppData> {
    const [tenant, choirs, users] = await Promise.all([
      this.getBootstrap(context.tenantSlug),
      this.listChoirs(context),
      this.listUsers(context),
    ])

    const memberships = (await Promise.all(choirs.map((choir) => this.listMemberships(context, choir.id).catch(() => [])))).flat()
    const events = (await Promise.all(choirs.map((choir) => this.listEvents(context, choir.id).catch(() => [])))).flat()

    return {
      tenant,
      choirs,
      users,
      memberships,
      songs: [],
      repertoires: [],
      materials: [],
      events,
      instruments: [],
    }
  }

  private async request<T>(
    path: string,
    options: {
      context?: RuntimeContext
      method?: string
      body?: unknown
    } = {},
  ): Promise<T> {
    const headers = new Headers()
    headers.set('Accept', 'application/json')

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json')
    }

    if (options.context) {
      headers.set('X-Tenant-Slug', options.context.tenantSlug)
      headers.set('X-User-Email', options.context.actorEmail)
    }

    const response = await fetch(`${this.baseURL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => undefined)
      throw new ApiError(response.status, payload?.message ?? response.statusText, payload?.code)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }
}

export const api = new CoralHubApi()
