'use client'

import { useState } from 'react'
import { Match } from '@/lib/types'
import styles from '../app/results/results.module.css'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function MatchCard({ m }: { m: Match }) {
  return (
    <div className={styles.card}>
      <div className={styles.match}>
        <div className={styles.winner}>{m.winner} / {m.partner1}</div>
        <div className={styles.loser}>{m.loser} / {m.partner2}</div>
      </div>
      <div className={styles.score}>
        {m.score.split(',').map((s, i) => {
          const clean = s.trim().replace(/\(\d+\)/g, '').replace(/\s*draw\s*/gi, '')
          const parts = clean.split('-').map(Number)
          if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
          const [w, l] = parts
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {i > 0 && <div className={styles.setDivider} />}
              <div className={styles.setBox}>
                <div className={`${styles.setNum} ${w > l ? styles.setWin : styles.setLose}`}>{w}</div>
                <div className={`${styles.setNum} ${l > w ? styles.setWin : styles.setLose}`}>{l}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ResultsList({
  latest, previous
}: {
  latest: Match[]
  previous: Match[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {latest.length === 0 ? (
        <div className={styles.empty}>No matches recorded yet.</div>
      ) : (
        <>
          <div className={styles.sessionHeader}>
            {latest[0]?.date ? formatDate(latest[0].date) : ''}
          </div>
          <div className={styles.list}>
            {latest.map(m => <MatchCard key={m.id} m={m} />)}
          </div>
        </>
      )}

      {previous.length > 0 && (
        <div className={styles.previousSection}>
          <button className={styles.toggleBtn} onClick={() => setOpen(o => !o)}>
            Previous games
            <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>›</span>
          </button>
          {open && (
            <div className={styles.previousList}>
              {Object.entries(
                previous.reduce((acc, m) => {
                  acc[m.date] = acc[m.date] ?? []
                  acc[m.date].push(m)
                  return acc
                }, {} as Record<string, Match[]>)
              )
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, ms]) => (
                  <div key={date}>
                    <div className={styles.sessionHeader}>{formatDate(date)}</div>
                    <div className={styles.list}>
                      {ms.map(m => <MatchCard key={m.id} m={m} />)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}