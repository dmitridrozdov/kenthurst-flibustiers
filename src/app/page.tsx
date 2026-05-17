import { promises as fs } from 'fs'
import path from 'path'
import { MatchData } from '@/lib/types'
import { calculateRatings, calculateRatingsPure } from '@/lib/ratings'
import Nav from '@/components/Nav'
import styles from './page.module.css'

export const revalidate = 0

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  { bg: 'rgba(201,168,76,0.18)', color: '#c9a84c' },
  { bg: 'rgba(74,130,184,0.18)', color: '#4a82b8' },
  { bg: 'rgba(107,189,94,0.18)', color: '#6bbd5e' },
  { bg: 'rgba(200,90,58,0.18)', color: '#c85a3a' },
  { bg: 'rgba(160,110,210,0.18)', color: '#a87ad8' },
  { bg: 'rgba(80,185,165,0.18)', color: '#4db8a8' },
]

function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

function buildHistory(player: string, matches: MatchData['matches']) {
  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date))
  const result: { win: boolean; pts: number }[] = []

  // replay ELO to get per-match deltas — simplified, no cross-dependency needed
  const ratings: Record<string, number> = {}
  const recentGames: Record<string, number> = {}
  const gamesPlayed: Record<string, number> = {}

  for (const m of sorted) {
    const all = [m.winner, m.partner1, m.loser, m.partner2]
    all.forEach((p) => {
      if (!(p in ratings)) { ratings[p] = 1200; recentGames[p] = 0; gamesPlayed[p] = 0 }
    })

    const domMult = (() => {
      let wg = 0, lg = 0
      for (const s of m.score.split(',')) {
        const parts = s.trim().replace(/\(\d+\)/g, '').split('-').map(Number)
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) { wg += parts[0]; lg += parts[1] }
      }
      const total = wg + lg
      return total === 0 ? 1 : 0.5 + wg / total
    })()

    const teamAAvg = (ratings[m.winner] + ratings[m.partner1]) / 2
    const teamBAvg = (ratings[m.loser]  + ratings[m.partner2]) / 2
    const expected = 1 / (1 + Math.pow(10, (teamBAvg - teamAAvg) / 400))

    const involves = (p: string) => [m.winner, m.partner1, m.loser, m.partner2].includes(p)
    const isWinner = (p: string) => [m.winner, m.partner1].includes(p)

    if (involves(player)) {
      const win = isWinner(player)
      const mult = 1 + Math.min(0.30, recentGames[player] * 0.03)
      const K = gamesPlayed[player] >= 20 ? 24 : 32
      const pts = win
        ? Math.round(K * mult * domMult * (1 - expected))
        : Math.round(K * (1 / mult) * domMult * (0 - expected))
      result.push({ win, pts: Math.abs(pts) })
    }

    ;[m.winner, m.partner1].forEach((p) => {
      const mult = 1 + Math.min(0.30, recentGames[p] * 0.03)
      const K = gamesPlayed[p] >= 20 ? 24 : 32
      const domM = domMult
      ratings[p] += Math.round(K * mult * domM * (1 - expected))
      gamesPlayed[p]++
      const days = Math.floor((Date.now() - new Date(m.date).getTime()) / 86400000)
      if (days <= 60) recentGames[p]++
    })
    ;[m.loser, m.partner2].forEach((p) => {
      const mult = 1 + Math.min(0.30, recentGames[p] * 0.03)
      const K = gamesPlayed[p] >= 20 ? 24 : 32
      ratings[p] += Math.round(K * (1 / mult) * domMult * (0 - expected))
      gamesPlayed[p]++
      const days = Math.floor((Date.now() - new Date(m.date).getTime()) / 86400000)
      if (days <= 60) recentGames[p]++
    })
  }

  return result.slice(-10)
}

export default async function HomePage() {
  const filePath = path.join(process.cwd(), 'data', 'matches.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  const data: MatchData = JSON.parse(raw)

  const allRatings = calculateRatings(data.players, data.matches)
  // const allRatings = calculateRatingsPure(data.players, data.matches)
  const ratings = allRatings.filter(r => r.gamesPlayed > 0)
  const history: Record<string, { win: boolean; pts: number }[]> = {}
  data.players.forEach((p) => { history[p] = buildHistory(p, data.matches) })
  const unstarted = allRatings.filter(r => r.gamesPlayed === 0)

  const thisMonth = data.matches.filter((m) => {
    const d = new Date(m.date)
    const now = new Date()
    return now.getTime() - d.getTime() < 30 * 24 * 3600 * 1000
  }).length

  return (
    <>
      <Nav />
      <main>
        {/* HERO */}
        <div className={styles.hero}>
          <svg className={styles.court} viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
            <rect x="100" y="30" width="600" height="240" fill="none" stroke="white" strokeWidth="2" />
            <line x1="400" y1="30" x2="400" y2="270" stroke="white" strokeWidth="1" />
            <rect x="200" y="30" width="400" height="240" fill="none" stroke="white" strokeWidth="1" />
            <line x1="200" y1="150" x2="600" y2="150" stroke="white" strokeWidth="1.5" />
            <circle cx="400" cy="150" r="4" fill="white" />
          </svg>
          <div className={styles.eyebrow}>Kenthurst · New South Wales</div>
          <h1 className={styles.heroTitle}>
            The <em>Flibustiers</em>
            <br />
            Doubles Rankings
          </h1>
          <div className={styles.heroDivider} />
          <p className={styles.heroSub}>
            Live ELO-based doubles ratings with activity multipliers. Play more, climb faster.
          </p>
          <div className={styles.heroStats}>
            <div>
              <div className={styles.statNum}>{data.players.length}</div>
              <div className={styles.statLbl}>Players</div>
            </div>
            <div>
              <div className={styles.statNum}>{data.matches.length}</div>
              <div className={styles.statLbl}>Matches</div>
            </div>
            <div>
              <div className={styles.statNum}>{thisMonth}</div>
              <div className={styles.statLbl}>This Month</div>
            </div>
          </div>
        </div>

        {/* RATINGS */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Doubles Ladder</h2>
            <span className={styles.sectionBadge}>Pair ELO · Activity Bonus</span>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelLabel}>Player · Doubles Rating</span>
              <span className={styles.panelLabel} style={{ display: 'flex', gap: '1.5rem' }}>
                <span>Act. Mult</span>
                <span>Games</span>
              </span>
            </div>
            {ratings.map((r, i) => {
              const av = avatarColor(r.name)
              const actLevel = r.recentGames >= 6 ? '#6bbd5e' : r.recentGames >= 3 ? '#c9a84c' : '#847e70'
              return (
                <div key={r.name} className={styles.playerRow}>
                  <div className={`${styles.rank} ${i < 3 ? styles.rankTop : ''}`}>{i + 1}</div>
                  <div
                    className={styles.avatar}
                    style={{ background: av.bg, color: av.color }}
                  >
                    {initials(r.name)}
                  </div>
                  <div className={styles.playerInfo}>
                    <div className={styles.playerName}>{r.name}</div>
                    {history[r.name] && history[r.name].length > 0 && (
                      <div className={styles.historyStrip}>
                        {[...history[r.name]].reverse().map((h, i) => (
                          <div
                            key={i}
                            className={`${styles.histBox} ${h.win ? styles.histWin : styles.histLoss}`}
                            title={`${h.win ? '+' : '-'}${h.pts} pts`}
                          >
                            {h.win ? '+' : '-'}{h.pts}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                    <div className={styles.ratingScore}>{r.rating}</div>
                    <div className={`${styles.ratingChange} ${r.ratingChange >= 0 ? styles.pos : styles.neg}`}>
                      {r.ratingChange >= 0 ? '+' : ''}{r.ratingChange} pts
                    </div>
                  </div>
                  {/* <div className={styles.multCol}>
                    <span className={styles.multBadge}>×{r.activityMultiplier.toFixed(2)}</span>
                    <span className={styles.gamesCol}>{r.gamesPlayed}</span>
                  </div> */}
                </div>
              )
            })}

            {unstarted.length > 0 && (
            <>
              <h3 style={{ marginTop: '2rem', marginBottom: '1rem', marginLeft: '2rem', fontSize: '1rem', fontWeight: 500, color: 'var(--text2)', letterSpacing: '0.05em' }}>
                Yet to play
              </h3>
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelLabel}>Player</span>
                  <span className={styles.panelLabel}>Starting Rating</span>
                </div>
                {unstarted.map((r) => {
                  const av = avatarColor(r.name)
                  return (
                    <div key={r.name} className={styles.playerRow}>
                      <div className={styles.rank}>—</div>
                      <div className={styles.avatar} style={{ background: av.bg, color: av.color }}>
                        {initials(r.name)}
                      </div>
                      <div className={styles.playerInfo}>
                        <div className={styles.playerName}>{r.name}</div>
                        <div className={styles.playerMeta}>No matches played yet</div>
                      </div>
                      <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                        <div className={styles.ratingScore} style={{ color: 'var(--text3)' }}>1200</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          </div>

          {/* EXPLAINER */}
          <div className={styles.explainer}>
            <h3 className={styles.explainerTitle}>How ratings are calculated</h3>
            <p className={styles.explainerText}>
              A modified ELO system with an activity bonus that rewards players who show up
              consistently. Your partner&apos;s rating and your own recent activity both influence
              how fast you gain points.
            </p>
            <pre className={styles.formula}>{`New Rating   = OldRating + K × ActivityMult × DomMult × (Result − Expected)
Expected     = 1 / (1 + 10^((TeamB_avg − TeamA_avg) / 400))
ActivityMult = 1.0 + min(0.30, matchesLast60Days × 0.03)  → ×mult on wins, ×(1/mult) on losses
DomMult      = 0.5 + (winnerGames / totalGames)  →  range: 1.0 – 1.5
Team Rating  = average of both partners' individual doubles ratings`}</pre>

            <div className={styles.factorsGrid}>
              <div className={styles.factorCard}>
                <div className={styles.factorName}>K-Factor</div>
                <div className={styles.factorDesc}>Base of 32. Drops to 24 after 20 games for more stable ratings over time.</div>
              </div>
              <div className={styles.factorCard}>
                <div className={styles.factorName}>Activity Bonus</div>
                <div className={styles.factorDesc}>+3% per match in last 60 days, capped at +30%. Boosts wins and softens losses — the more you play, the more the ladder rewards you.</div>
              </div>
              <div className={styles.factorCard}>
                <div className={styles.factorName}>Dominance Multiplier</div>
                <div className={styles.factorDesc}>Scales points by set margin. 6-0, 6-0 gives ×1.5 — a 7-6, 6-7, 7-6 war gives ×1.04. Closer to ×1.5 the more dominant the win.</div>
              </div>
              <div className={styles.factorCard}>
                <div className={styles.factorName}>Doubles Split</div>
                <div className={styles.factorDesc}>Each partner gains/loses individually. Team average determines the expected result.</div>
              </div>
            </div>

          </div>
        </div>
      </main>
      <footer className={styles.footer}>
        © 2026 <em>The Kenthurst Flibustiers</em> · Kenthurst, NSW · Play hard, play fair
      </footer>
    </>
  )
}
