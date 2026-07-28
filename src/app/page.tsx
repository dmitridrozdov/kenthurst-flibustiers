'use client'

import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { calculateRatings } from '@/lib/ratings'
import { Match } from '@/lib/types'
import Nav from '@/components/Nav'
import styles from './page.module.css'

const MAX_RATING = 16.5
const BASE_K = 0.15
const VETERAN_K = 0.10
const VETERAN_THRESHOLD = 20
const STARTING_RATING = 4.0

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

function buildHistory(player: string, matches: Match[]) {
  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date))
  const history: { win: boolean; pts: number }[] = []

  const ratings: Record<string, number> = {}
  const recentGames: Record<string, number> = {}
  const gamesPlayed: Record<string, number> = {}

  for (const m of sorted) {
    const all = [m.winner, m.partner1, m.loser, m.partner2]
    all.forEach((p) => {
      if (!(p in ratings)) {
        ratings[p] = STARTING_RATING
        recentGames[p] = 0
        gamesPlayed[p] = 0
      }
    })

    let wg = 0, lg = 0
    for (const s of m.score.split(',')) {
      const parts = s.trim().replace(/\(\d+\)/g, '').replace(/\s*draw\s*/gi, '').split('-').map(Number)
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        wg += parts[0]
        lg += parts[1]
      }
    }

    const isDraw = m.score.toLowerCase().includes('draw') || wg === lg
    const involves = (p: string) => all.includes(p)
    const isWinner = (p: string) => [m.winner, m.partner1].includes(p)

    if (involves(player)) {
      const win = isWinner(player)
      const mult = 1 + Math.min(0.30, recentGames[player] * 0.03)
      const k = gamesPlayed[player] >= VETERAN_THRESHOLD ? VETERAN_K : BASE_K
      let pts: number

      if (isDraw) {
        const teamAAvg = (ratings[m.winner] + ratings[m.partner1]) / 2
        const teamBAvg = (ratings[m.loser] + ratings[m.partner2]) / 2
        const midpoint = (teamAAvg + teamBAvg) / 2
        pts = Math.abs(k * (midpoint - ratings[player]))
      } else {
        const total = wg + lg || 1
        const winPerf = MAX_RATING * Math.pow(wg / total, 1.2)
        const losePerf = MAX_RATING * Math.pow(lg / total, 1.2)
        const perf = win ? winPerf : losePerf
        const actFactor = win ? mult : (1 / mult)
        pts = Math.abs(k * actFactor * (perf - ratings[player]))
      }

      history.push({ win: isDraw ? true : win, pts: parseFloat(pts.toFixed(2)) })
    }

    // update ratings for all players to keep state correct for future matches
    const total = wg + lg || 1

    if (isDraw) {
      const teamAAvg = (ratings[m.winner] + ratings[m.partner1]) / 2
      const teamBAvg = (ratings[m.loser] + ratings[m.partner2]) / 2
      const midpoint = (teamAAvg + teamBAvg) / 2

      ;[m.winner, m.partner1, m.loser, m.partner2].forEach((p) => {
        const k = gamesPlayed[p] >= VETERAN_THRESHOLD ? VETERAN_K : BASE_K
        ratings[p] = parseFloat((ratings[p] + k * (midpoint - ratings[p])).toFixed(2))
        gamesPlayed[p]++
        const days = Math.floor((Date.now() - new Date(m.date).getTime()) / 86400000)
        if (days <= 60) recentGames[p]++
      })
    } else {
      const winPerf = MAX_RATING * Math.pow(wg / total, 1.2)
      const losePerf = MAX_RATING * Math.pow(lg / total, 1.2)

      ;[m.winner, m.partner1].forEach((p) => {
        const mult = 1 + Math.min(0.30, recentGames[p] * 0.03)
        const k = gamesPlayed[p] >= VETERAN_THRESHOLD ? VETERAN_K : BASE_K
        ratings[p] = parseFloat(Math.min(MAX_RATING, ratings[p] + k * mult * (winPerf - ratings[p])).toFixed(2))
        gamesPlayed[p]++
        const days = Math.floor((Date.now() - new Date(m.date).getTime()) / 86400000)
        if (days <= 60) recentGames[p]++
      })

      ;[m.loser, m.partner2].forEach((p) => {
        const mult = 1 + Math.min(0.30, recentGames[p] * 0.03)
        const k = gamesPlayed[p] >= VETERAN_THRESHOLD ? VETERAN_K : BASE_K
        ratings[p] = parseFloat(Math.max(1.0, ratings[p] + k * (1 / mult) * (losePerf - ratings[p])).toFixed(2))
        gamesPlayed[p]++
        const days = Math.floor((Date.now() - new Date(m.date).getTime()) / 86400000)
        if (days <= 60) recentGames[p]++
      })
    }
  }

  return history.slice(-10)
}

export default function HomePage() {
  const players = useQuery(api.players.list)
  const matches = useQuery(api.matches.list)

  if (players === undefined || matches === undefined) {
    return (
      <>
        <Nav />
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text2)' }}>Loading…</div>
      </>
    )
  }

  const allRatings = calculateRatings(players, matches)
  const maxGames = Math.max(...allRatings.map(r => r.gamesPlayed), 0)
  const threshold = maxGames * 0.3

  const ratings = allRatings.filter(r => r.gamesPlayed >= threshold && r.gamesPlayed > 0)
  const provisional = allRatings.filter(r => r.gamesPlayed > 0 && r.gamesPlayed < threshold)
  const unstarted = allRatings.filter(r => r.gamesPlayed === 0)

  const history: Record<string, { win: boolean; pts: number }[]> = {}
  players.forEach((p) => { history[p] = buildHistory(p, matches) })

  const thisMonth = matches.filter((m) => {
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
            UTR-style doubles ratings with activity multipliers. Play more, climb faster.
          </p>
          <div className={styles.heroStats}>
            <div>
              <div className={styles.statNum}>{players.length}</div>
              <div className={styles.statLbl}>Players</div>
            </div>
            <div>
              <div className={styles.statNum}>{matches.length}</div>
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
            <span className={styles.sectionBadge}>UTR-style · Activity Bonus</span>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelLabel}>Player · Doubles Rating</span>
              <span className={styles.panelLabel}>Games</span>
            </div>
            {ratings.map((r, i) => {
              const av = avatarColor(r.name)
              return (
                <div key={r.name} className={styles.playerRow}>
                  <div className={`${styles.rank} ${i < 3 ? styles.rankTop : ''}`}>{i + 1}</div>
                  <div className={styles.avatar} style={{ background: av.bg, color: av.color }}>
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
                            title={`${h.win ? '+' : '-'}${h.pts.toFixed(2)}`}
                          >
                            {h.win ? '+' : '-'}{h.pts.toFixed(2)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                    <div className={styles.ratingScore}>{r.rating.toFixed(2)}</div>
                    <div className={`${styles.ratingChange} ${r.ratingChange >= 0 ? styles.pos : styles.neg}`}>
                      {r.ratingChange >= 0 ? '+' : ''}{r.ratingChange.toFixed(2)}
                    </div>
                  </div>
                  <div className={styles.multCol}>
                    <span className={styles.gamesCol}>{r.gamesPlayed}</span>
                  </div>
                </div>
              )
            })}

            {provisional.length > 0 && (
              <>
                <h3 style={{ marginTop: '2rem', marginBottom: '0.5rem', marginLeft: '2rem', fontSize: '1rem', fontWeight: 500, color: 'var(--text2)', letterSpacing: '0.05em' }}>
                  Provisional
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '1rem', marginLeft: '2rem', fontWeight: 300 }}>
                  Fewer than {Math.ceil(threshold)} games played — not yet ranked
                </p>
                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <span className={styles.panelLabel}>Player · Rating</span>
                    <span className={styles.panelLabel}>Games</span>
                  </div>
                  {provisional.map((r) => {
                    const av = avatarColor(r.name)
                    return (
                      <div key={r.name} className={styles.playerRow}>
                        <div className={styles.rank}>—</div>
                        <div className={styles.avatar} style={{ background: av.bg, color: av.color }}>
                          {initials(r.name)}
                        </div>
                        <div className={styles.playerInfo}>
                          <div className={styles.playerName}>{r.name}</div>
                          {history[r.name] && history[r.name].length > 0 && (
                            <div className={styles.historyStrip}>
                              {[...history[r.name]].reverse().map((h, i) => (
                                <div key={i} className={`${styles.histBox} ${h.win ? styles.histWin : styles.histLoss}`}>
                                  {h.win ? '+' : '-'}{h.pts.toFixed(2)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                          <div className={styles.ratingScore} style={{ color: 'var(--text2)' }}>{r.rating.toFixed(2)}</div>
                          <div className={`${styles.ratingChange} ${r.ratingChange >= 0 ? styles.pos : styles.neg}`}>
                            {r.ratingChange >= 0 ? '+' : ''}{r.ratingChange.toFixed(2)}
                          </div>
                        </div>
                        <div className={styles.multCol}>
                          <span className={styles.gamesCol}>{r.gamesPlayed}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

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
                        </div>
                        <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                          <div className={styles.ratingScore} style={{ color: 'var(--text3)' }}>4.00</div>
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
              A UTR-inspired system with an activity bonus that rewards players who show up
              consistently. Your partner&apos;s rating and your own recent activity both influence
              how fast you gain or lose points.
            </p>
            <pre className={styles.formula}>{`Scale        = 1.0 – 16.5  (UTR-style, starting rating 4.0)
Performance  = 16.5 × (gamesWon / totalGames)^1.2
New Rating   = OldRating + K × ActivityMult × (Performance − OldRating)
ActivityMult = 1.0 + min(0.30, matchesLast60Days × 0.03)  →  wins boosted, losses softened
K            = 0.15 (0.10 after 20 games for stability)
Draw         = both pairs move toward midpoint of team averages`}</pre>
            <div className={styles.factorsGrid}>
              <div className={styles.factorCard}>
                <div className={styles.factorName}>UTR Scale</div>
                <div className={styles.factorDesc}>Ratings run 1.0 – 16.5. Everyone starts at 4.0. Top club players typically settle between 6 and 10.</div>
              </div>
              <div className={styles.factorCard}>
                <div className={styles.factorName}>Performance Score</div>
                <div className={styles.factorDesc}>Based on games won vs lost across all sets. 6-0 is far more rewarding than 7-5. Exponent of 1.2 amplifies dominant wins.</div>
              </div>
              <div className={styles.factorCard}>
                <div className={styles.factorName}>Activity Bonus</div>
                <div className={styles.factorDesc}>+3% per match in last 60 days, capped at +30%. Boosts wins and softens losses — regulars benefit most.</div>
              </div>
              <div className={styles.factorCard}>
                <div className={styles.factorName}>Doubles Split</div>
                <div className={styles.factorDesc}>Both partners move toward the same performance score. Draws move both pairs toward their combined average.</div>
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