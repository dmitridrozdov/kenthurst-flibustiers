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

function parseSets(score: string, winnerPerspective: boolean) {
  return score.split(',').map((s) => {
    const clean = s.trim().replace(/\(\d+\)/g, '').replace(/\s*draw\s*/gi, '')
    const parts = clean.split('-').map(Number)
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
    const [w, l] = parts
    const iWin = winnerPerspective ? w > l : l > w
    return { top: winnerPerspective ? w : l, bot: winnerPerspective ? l : w, topWin: w > l, botWin: l > w }
  }).filter(Boolean)
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
