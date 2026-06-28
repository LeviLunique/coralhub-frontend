type EmptyArtProps = {
  size?: number
}

export function EmptyArt({ size = 220 }: EmptyArtProps) {
  return (
    <svg aria-hidden="true" fill="none" height={size} role="img" viewBox="0 0 220 200" width={size} xmlns="http://www.w3.org/2000/svg">
      <rect fill="var(--color-surface-strong)" height="150" rx="10" stroke="var(--color-border)" width="116" x="62" y="28" />
      <rect fill="var(--color-border)" height="6" rx="3" width="60" x="86" y="58" />
      <rect fill="var(--color-border)" height="6" rx="3" width="72" x="86" y="80" />
      <rect fill="var(--color-border)" height="6" rx="3" width="48" x="86" y="102" />
      <rect fill="var(--color-border)" height="6" rx="3" width="66" x="86" y="124" />
      <rect fill="rgba(99, 102, 241, 0.16)" height="58" rx="12" width="58" x="36" y="58" />
      <path d="M68 76v22a6 6 0 1 1-4-5.6V78l12-3v15a6 6 0 1 1-4-5.6V73z" fill="#6366f1" />
      <rect fill="rgba(34, 197, 94, 0.16)" height="58" rx="12" width="58" x="126" y="76" />
      <g fill="#16a34a">
        <rect height="10" rx="2" width="4" x="142" y="100" />
        <rect height="22" rx="2" width="4" x="150" y="94" />
        <rect height="32" rx="2" width="4" x="158" y="89" />
        <rect height="18" rx="2" width="4" x="166" y="96" />
        <rect height="8" rx="2" width="4" x="174" y="101" />
      </g>
      <rect fill="rgba(216, 110, 70, 0.16)" height="50" rx="12" width="50" x="62" y="118" />
      <path d="M81 130v26l22-13z" fill="var(--brand-burgundy, #b9532e)" />
    </svg>
  )
}
