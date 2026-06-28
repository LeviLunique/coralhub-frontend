export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

export function eventTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    rehearsal: 'Ensaio',
    presentation: 'Apresentação',
    other: 'Outro',
  }

  return labels[value] ?? value
}

export function roleLabel(value: string): string {
  const labels: Record<string, string> = {
    manager: 'Gestor',
    member: 'Integrante',
  }

  return labels[value] ?? value
}
