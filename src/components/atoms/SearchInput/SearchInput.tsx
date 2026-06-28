import { Search } from 'lucide-react'
import styles from './SearchInput.module.css'

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChange, placeholder = 'Pesquisar' }: SearchInputProps) {
  return (
    <div className={styles.wrapper}>
      <Search aria-hidden="true" size={16} />
      <input className={styles.input} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type="search" value={value} />
    </div>
  )
}
