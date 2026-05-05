'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Nav.module.css'

const links = [
  { href: '/', label: 'Rankings' },
  { href: '/results', label: 'Results' },
  { href: '/open', label: 'Kenthurst Open', badge: 'Soon' },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        The Kenthurst Flibustiers
        <span>Est. 2024 · Tennis Club</span>
      </div>
      <div className={styles.links}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href ? styles.active : ''}
          >
            {l.label}
            {l.badge && <span className={styles.badge}>{l.badge}</span>}
          </Link>
        ))}
      </div>
    </nav>
  )
}
