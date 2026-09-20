'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import styles from './Nav.module.css'

const mainLinks = [
  { href: '/', label: 'Rankings' },
  { href: '/results', label: 'Results' },
  { href: '/record', label: 'Record' },
]

const moreLinks = [
  { href: '/weather', label: '🌤 Weather' },
  { href: '/analytics', label: '📊 Analytics' },
  { href: '/open', label: '🏆 Kenthurst Open' },
]

export default function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const moreActive = moreLinks.some(l => pathname === l.href)

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        The Kenthurst Flibustiers
        <span>Est. 2024 · Tennis Club</span>
      </div>
      <div className={styles.links}>
        {mainLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href ? styles.active : ''}
          >
            {l.label}
          </Link>
        ))}

        <div className={styles.moreWrapper} ref={ref}>
          <button
            className={`${styles.moreBtn} ${moreActive ? styles.active : ''}`}
            onClick={() => setOpen(o => !o)}
          >
            More
            <svg
              className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
              width="12" height="12" viewBox="0 0 24 24" fill="none"
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {open && (
            <div className={styles.dropdown}>
              {moreLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`${styles.dropdownItem} ${pathname === l.href ? styles.dropdownActive : ''}`}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}