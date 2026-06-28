export function newID(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
