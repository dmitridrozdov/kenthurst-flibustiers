import { promises as fs } from 'fs'
import path from 'path'
import { MatchData } from '@/lib/types'
import Nav from '@/components/Nav'
import styles from './results.module.css'

export const revalidate = 0

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ResultsPage() {
  const filePath = path.join(process.cwd(), 'data', 'matches.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  const data: MatchData = JSON.parse(raw)

  const sorted = [...data.matches].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <Nav />
      <main>
        <div className={styles.section}>
          <div className={styles.header}>
            <h1 className={styles.title}>Match Results</h1>
            <span className={styles.badge}>2026 Season</span>
          </div>

          {sorted.length === 0 ? (
            <div className={styles.empty}>No matches recorded yet.</div>
          ) : (
            <div className={styles.list}>
              {sorted.map((m) => (
                <div key={m.id} className={styles.card}>
                  <div className={styles.date}>{formatDate(m.date)}</div>
                  <div className={styles.match}>
                    <div className={styles.teams}>
                      <span className={styles.winner}>{m.winner} / {m.partner1}</span>
                      <span className={styles.vs}>def.</span>
                      <span className={styles.loser}>{m.loser} / {m.partner2}</span>
                    </div>
                    <div className={styles.meta}>Doubles · {m.surface}</div>
                  </div>
                  <div className={styles.score}>
                    {m.score.split(',').map((s, i) => {
                      const parts = s.trim().split('-')
                      const wScore = parseInt(parts[0])
                      const lScore = parseInt(parts[1])
                      const winnerLeads = !isNaN(wScore) && !isNaN(lScore) && wScore > lScore
                      return (
                        <span key={i}>
                          {i > 0 ? ', ' : ''}
                          {winnerLeads ? <b>{s.trim()}</b> : s.trim()}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <footer className={styles.footer}>
        © 2026 <em>The Kenthurst Flibustiers</em> · Kenthurst, NSW · Play hard, play fair
      </footer>
    </>
  )
}
