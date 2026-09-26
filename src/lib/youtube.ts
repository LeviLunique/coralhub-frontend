export type YouTubeVideo = {
  id: string
  title: string
  channel: string
  thumbnailURL: string
  url: string
}

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string }
    snippet?: {
      title?: string
      channelTitle?: string
      thumbnails?: {
        medium?: { url?: string }
        default?: { url?: string }
      }
    }
  }>
}

type YouTubeOEmbedResponse = {
  title?: string
  author_name?: string
  thumbnail_url?: string
}

const youtubeAPIKey = import.meta.env.VITE_YOUTUBE_API_KEY?.trim() ?? ''

export const youtubeSearchEnabled = Boolean(youtubeAPIKey)

export function youtubeVideoID(value: string): string | null {
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      return url.pathname.slice(1).split('/')[0] || null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      return url.searchParams.get('v') ?? url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1] ?? null
    }
    return null
  } catch {
    return null
  }
}

export function youtubeWatchURL(videoID: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoID)}`
}

export function youtubeEmbedURL(value: string): string | null {
  const videoID = youtubeVideoID(value)
  return videoID ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoID)}` : null
}

function decodeHTML(value: string): string {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

export async function findYouTubeVideos(input: string, signal?: AbortSignal): Promise<YouTubeVideo[]> {
  const term = input.trim()
  const pastedVideoID = youtubeVideoID(term)

  if (pastedVideoID) {
    const url = youtubeWatchURL(pastedVideoID)
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { signal })
    if (!response.ok) {
      return [{ id: pastedVideoID, title: 'Vídeo do YouTube', channel: 'YouTube', thumbnailURL: `https://i.ytimg.com/vi/${pastedVideoID}/mqdefault.jpg`, url }]
    }
    const payload = await response.json() as YouTubeOEmbedResponse
    return [{
      id: pastedVideoID,
      title: payload.title ?? 'Vídeo do YouTube',
      channel: payload.author_name ?? 'YouTube',
      thumbnailURL: payload.thumbnail_url ?? `https://i.ytimg.com/vi/${pastedVideoID}/mqdefault.jpg`,
      url,
    }]
  }

  if (!youtubeAPIKey || term.length < 3) {
    return []
  }

  const params = new URLSearchParams({
    key: youtubeAPIKey,
    maxResults: '6',
    part: 'snippet',
    q: term,
    regionCode: 'BR',
    relevanceLanguage: 'pt',
    safeSearch: 'moderate',
    type: 'video',
    videoEmbeddable: 'true',
  })
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal })
  if (!response.ok) {
    throw new Error('Não foi possível pesquisar no YouTube agora.')
  }

  const payload = await response.json() as YouTubeSearchResponse
  return (payload.items ?? []).flatMap((item) => {
    const id = item.id?.videoId
    if (!id) {
      return []
    }
    return [{
      id,
      title: decodeHTML(item.snippet?.title ?? 'Vídeo do YouTube'),
      channel: decodeHTML(item.snippet?.channelTitle ?? 'YouTube'),
      thumbnailURL: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      url: youtubeWatchURL(id),
    }]
  })
}
