import { promises as fs } from 'fs'
import path from 'path'
import { MatchData } from '@/lib/types'
import Nav from '@/components/Nav'
import ResultsList from '@/components/ResultsList'
import styles from './results.module.css'

export const revalidate = 0

export default async function ResultsPage() {
  const filePath = path.join(process.cwd(), 'data', 'matches.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  const data: MatchData = JSON.parse(raw)

  const sorted = [...data.matches].sort((a, b) => b.date.localeCompare(a.date))
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