'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './PlayerSelect.module.css'

interface Props {
  players: string[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  exclude?: string[]
}

export default function PlayerSelect({ players, value, onChange, placeholder, exclude = [] }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const available = players.filter((p) => p === value || !exclude.includes(p))

  function initials(name: string) {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
      >
        {value ? (
          <span className={styles.selected}>
            <span className={styles.avatar}>{initials(value)}</span>
            {value}
          </span>
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className={styles.menu}>
          {available.length === 0 ? (
            <div className={styles.empty}>No players available</div>
          ) : (
            available.map((p) => (
              <button
                type="button"
                key={p}
                className={`${styles.option} ${p === value ? styles.optionActive : ''}`}
                onClick={() => {
                  onChange(p)
                  setOpen(false)
                }}
              >
                <span className={styles.avatar}>{initials(p)}</span>
                {p}
                {p === value && (
                  <svg className={styles.check} width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}