'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Nav from '@/components/Nav'
import ResultsList from '@/components/ResultsList'
import styles from './results.module.css'

export default function ResultsPage() {
  const matches = useQuery(api.matches.list)

  if (matches === undefined) {
    return (
      <>
        <Nav />
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text2)' }}>Loading…</div>
      </>
    )
  }

  const sorted = [...matches].sort((a, b) => b.date.localeCompare(a.date))
  const latestDate = sorted[0]?.date ?? null
  const latest = sorted.filter(m => m.date === latestDate)
  const previous = sorted.filter(m => m.date !== latestDate)

  return (
    <>
      <Nav />
      <main>
        <div className={styles.section}>
          <div className={styles.header}>
            <h1 className={styles.title}>Match Results</h1>
            <span className={styles.badge}>2026 Season</span>
          </div>
          <ResultsList latest={latest} previous={previous} />
        </div>
      </main>
      <footer className={styles.footer}>
        © 2026 <em>The Kenthurst Flibustiers</em> · Kenthurst, NSW · Play hard, play fair
      </footer>
    </>
  )
}