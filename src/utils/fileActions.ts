// Client-side helpers for the "more" menu actions. When the backend serves a
// real file URL these can download it directly; until then they operate on the
// content we already have (text) so the actions always give feedback.

export type ShareResult = 'shared' | 'copied' | 'unavailable'

type ShareInput = {
  title: string
  text: string
  url?: string
}

export async function shareOrCopy({ title, text, url }: ShareInput): Promise<ShareResult> {
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title, text, url })
      return 'shared'
    } catch {
      // User dismissed the share sheet or it failed — fall back to clipboard.
    }
  }
  const clipboardText = [title, text, url].filter(Boolean).join(' — ')
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(clipboardText)
      return 'copied'
    } catch {
      return 'unavailable'
    }
  }
  return 'unavailable'
}

// Trigger a browser download for an already-available URL (e.g. a backend file).
export function downloadUrl(url: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

// Download in-memory text content (used for notes / placeholders while offline).
export function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  downloadUrl(url, filename)
  URL.revokeObjectURL(url)
}
