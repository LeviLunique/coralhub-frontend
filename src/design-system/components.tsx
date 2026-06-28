import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  size?: 'sm' | 'md'
  icon?: ReactNode
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button--${variant} button--${size} ${className}`}
      disabled={disabled || loading}
      type={props.type ?? 'button'}
      {...props}
    >
      {loading ? <Loader2 className="button__icon spin" aria-hidden="true" /> : icon}
      {children ? <span>{children}</span> : null}
    </button>
  )
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  active?: boolean
  children: ReactNode
}

export function IconButton({ label, active = false, children, className = '', ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`icon-button ${active ? 'is-active' : ''} ${className}`}
      title={label}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
}

export function Field({ label, hint, className = '', ...props }: FieldProps) {
  return (
    <label className={`field ${className}`}>
      <span className="field__label">{label}</span>
      <input className="input" {...props} />
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  )
}

type TextAreaProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function TextArea({ label, value, onChange, placeholder }: TextAreaProps) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <textarea className="textarea" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  children: ReactNode
}

export function SelectField({ label, children, className = '', ...props }: SelectFieldProps) {
  return (
    <label className={`field ${className}`}>
      <span className="field__label">{label}</span>
      <select className="select" {...props}>
        {children}
      </select>
    </label>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'gold' | 'green' | 'red' | 'blue' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export function Stat({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <strong>{value}</strong>
      <span className="stat__detail">{detail}</span>
    </div>
  )
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="section-title">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  )
}
