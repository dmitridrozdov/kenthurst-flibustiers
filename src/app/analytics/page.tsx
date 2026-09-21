'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { calculateRatings } from '@/lib/ratings'
import { Match } from '@/lib/types'
import Nav from '@/components/Nav'
import styles from './analytics.module.css'

const MAX_RATING = 16.5
const BASE_K = 0.15
const VETERAN_K = 0.10
const VETERAN_THRESHOLD = 20
const STARTING_RATING = 4.0

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

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function parseGames(score: string) {
  let wg = 0, lg = 0
  for (const s of score.split(',')) {
    const parts = s.trim().replace(/\(\d+\)/g, '').replace(/\s*draw\s*/gi, '').split('-').map(Number)
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) { wg += parts[0]; lg += parts[1] }
  }
  return { wg, lg }
}

function perf(won: number, lost: number) {
  const total = won + lost
  if (total === 0) return STARTING_RATING
  return MAX_RATING * Math.pow(won / total, 1.2)
}

interface PlayerStats {
  name: string
  wins: number
  losses: number
  draws: number
  winRate: number
  gamesPlayed: number
  totalGamesWon: number
  totalGamesLost: number
  ratingHistory: { date: string; rating: number }[]
  partners: Record<string, { wins: number; losses: number }>
  opponents: Record<string, { wins: number; losses: number }>
  bestWin: { opponent: string; score: string; date: string } | null
  streak: { type: 'W' | 'L' | 'D'; count: number }
}

function buildPlayerStats(player: string, matches: Match[]): PlayerStats {
  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date))

  const ratings: Record<string, number> = {}
  const gamesPlayed: Record<string, number> = {}
  const recentGames: Record<string, number> = {}

  const stats: PlayerStats = {
    name: player,
    wins: 0, losses: 0, draws: 0,
    winRate: 0, gamesPlayed: 0,
    totalGamesWon: 0, totalGamesLost: 0,
    ratingHistory: [],
    partners: {}, opponents: {},
    bestWin: null,
    streak: { type: 'W', count: 0 },
  }

  let streakType: 'W' | 'L' | 'D' | null = null
  let streakCount = 0

  for (const m of sorted) {
    const all = [m.winner, m.partner1, m.loser, m.partner2]
    all.forEach(p => {
      if (!(p in ratings)) { ratings[p] = STARTING_RATING; gamesPlayed[p] = 0; recentGames[p] = 0 }
    })

    const { wg, lg } = parseGames(m.score)
    const draw = m.score.toLowerCase().includes('draw') || wg === lg
    const involves = all.includes(player)
    const isWinner = [m.winner, m.partner1].includes(player)

    if (involves) {
      const partner = isWinner
        ? (m.winner === player ? m.partner1 : m.winner)
        : (m.loser === player ? m.partner2 : m.loser)
      const opp1 = isWinner ? m.loser : m.winner
      const opp2 = isWinner ? m.partner2 : m.partner1

      // partners
      if (!stats.partners[partner]) stats.partners[partner] = { wins: 0, losses: 0 }
      // opponents
      ;[opp1, opp2].forEach(o => {
        if (!stats.opponents[o]) stats.opponents[o] = { wins: 0, losses: 0 }
      })

      if (draw) {
        stats.draws++
        ;[opp1, opp2].forEach(o => { stats.opponents[o].losses += 0 })
        streakType = 'D'; streakCount = streakCount === 0 || streakType === 'D' ? streakCount + 1 : 1
      } else if (isWinner) {
        stats.wins++
        stats.totalGamesWon += wg; stats.totalGamesLost += lg
        stats.partners[partner].wins++
        ;[opp1, opp2].forEach(o => stats.opponents[o].wins++)
        if (!stats.bestWin || wg - lg > (stats.bestWin ? parseInt(stats.bestWin.score.split('-')[0]) - parseInt(stats.bestWin.score.split('-')[1]) : 0)) {
          stats.bestWin = { opponent: `${opp1} / ${opp2}`, score: m.score, date: m.date }
        }
        if (streakType === 'W') streakCount++
        else { streakType = 'W'; streakCount = 1 }
      } else {
        stats.losses++
        stats.totalGamesWon += lg; stats.totalGamesLost += wg
        stats.partners[partner].losses++
        ;[opp1, opp2].forEach(o => stats.opponents[o].losses++)
        if (streakType === 'L') streakCount++
        else { streakType = 'L'; streakCount = 1 }
      }
      stats.gamesPlayed++
    }

    // update ratings
    const mult = (p: string) => 1 + Math.min(0.30, recentGames[p] * 0.03)
    const k = (p: string) => gamesPlayed[p] >= VETERAN_THRESHOLD ? VETERAN_K : BASE_K
    const days = Math.floor((Date.now() - new Date(m.date).getTime()) / 86400000)
    const isRecent = days <= 60

    if (draw) {
      const tA = (ratings[m.winner] + ratings[m.partner1]) / 2
      const tB = (ratings[m.loser] + ratings[m.partner2]) / 2
      const mid = (tA + tB) / 2
      all.forEach(p => {
        ratings[p] = parseFloat((ratings[p] + k(p) * (mid - ratings[p])).toFixed(2))
        gamesPlayed[p]++
        if (isRecent) recentGames[p]++
      })
    } else {
      const wp = perf(wg, lg), lp = perf(lg, wg)
      ;[m.winner, m.partner1].forEach(p => {
        ratings[p] = parseFloat(Math.min(MAX_RATING, ratings[p] + k(p) * mult(p) * (wp - ratings[p])).toFixed(2))
        gamesPlayed[p]++; if (isRecent) recentGames[p]++
      })
      ;[m.loser, m.partner2].forEach(p => {
        ratings[p] = parseFloat(Math.max(1.0, ratings[p] + k(p) * (1 / mult(p)) * (lp - ratings[p])).toFixed(2))
        gamesPlayed[p]++; if (isRecent) recentGames[p]++
      })
    }

    if (involves) {
      stats.ratingHistory.push({ date: m.date, rating: ratings[player] })
    }
  }

  stats.winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0
  stats.streak = { type: streakType ?? 'W', count: streakCount }
  return stats
}

function buildPairStats(matches: Match[]) {
  const pairs: Record<string, { wins: number; losses: number; draws: number; matches: Match[] }> = {}

  for (const m of matches) {
    const pairKey = [m.winner, m.partner1].sort().join(' / ')
    const loseKey = [m.loser, m.partner2].sort().join(' / ')
    const { wg, lg } = parseGames(m.score)
    const draw = m.score.toLowerCase().includes('draw') || wg === lg

    if (!pairs[pairKey]) pairs[pairKey] = { wins: 0, losses: 0, draws: 0, matches: [] }
    if (!pairs[loseKey]) pairs[loseKey] = { wins: 0, losses: 0, draws: 0, matches: [] }

    if (draw) {
      pairs[pairKey].draws++; pairs[loseKey].draws++
    } else {
      pairs[pairKey].wins++; pairs[loseKey].losses++
    }
    pairs[pairKey].matches.push(m)
    pairs[loseKey].matches.push(m)
  }

  return Object.entries(pairs)
    .map(([pair, s]) => ({ pair, ...s, total: s.wins + s.losses + s.draws, winRate: s.wins + s.losses > 0 ? Math.round(s.wins / (s.wins + s.losses) * 100) : 0 }))
    .filter(p => p.total >= 1)
    .sort((a, b) => b.total - a.total)
}

// Tiny SVG sparkline
function RatingChart({ history }: { history: { date: string; rating: number }[] }) {
  if (history.length < 2) return <div className={styles.chartEmpty}>Not enough data</div>

  const W = 320, H = 80, PAD = 8
  const ratings = history.map(h => h.rating)
  const min = Math.min(...ratings) - 0.5
  const max = Math.max(...ratings) + 0.5
  const range = max - min || 1

  const points = history.map((h, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (h.rating - min) / range) * (H - PAD * 2)
    return { x, y, rating: h.rating, date: h.date }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`

  const last = points[points.length - 1]
  const prev = points[points.length - 2]
  const trending = last.y < prev.y

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trending ? '#7dd16e' : '#ff6b4a'} stopOpacity="0.25" />
            <stop offset="100%" stopColor={trending ? '#7dd16e' : '#ff6b4a'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#chartGrad)" />
        <path d={pathD} fill="none" stroke={trending ? '#7dd16e' : '#ff6b4a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5"
            fill={trending ? '#7dd16e' : '#ff6b4a'}
            opacity={i === points.length - 1 ? 1 : 0.4}
          />
        ))}
      </svg>
      <div className={styles.chartLabels}>
        <span>{history[0].date.slice(5)}</span>
        <span className={trending ? styles.trendUp : styles.trendDown}>
          {trending ? '↑' : '↓'} {last.rating.toFixed(2)}
        </span>
        <span>{history[history.length - 1].date.slice(5)}</span>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const players = useQuery(api.players.list)
  const matches = useQuery(api.matches.list)
  const [tab, setTab] = useState<'players' | 'pairs'>('players')
  const [selected, setSelected] = useState<string | null>(null)

  if (!players || !matches) return (
    <>
      <Nav />
      <div className={styles.loading}>Loading analytics…</div>
    </>
  )

  const allRatings = calculateRatings(players, matches)
  const pairStats = buildPairStats(matches)

  const selectedStats = selected ? buildPlayerStats(selected, matches) : null

  return (
    <>
      <Nav />
      <main>
        <div className={styles.section}>
          <div className={styles.pageHeader}>
            <h1 className={styles.title}>Analytics</h1>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${tab === 'players' ? styles.tabActive : ''}`} onClick={() => { setTab('players'); setSelected(null) }}>Players</button>
              <button className={`${styles.tab} ${tab === 'pairs' ? styles.tabActive : ''}`} onClick={() => { setTab('pairs'); setSelected(null) }}>Pairs</button>
            </div>
          </div>

          {tab === 'players' && !selected && (
            <div className={styles.playerGrid}>
              {allRatings.filter(r => r.gamesPlayed > 0).map((r, i) => {
                const av = avatarColor(r.name)
                const stats = buildPlayerStats(r.name, matches)
                return (
                  <button key={r.name} className={styles.playerCard} onClick={() => setSelected(r.name)}>
                    <div className={styles.playerCardTop}>
                      <div className={styles.avatar} style={{ background: av.bg, color: av.color }}>{initials(r.name)}</div>
                      <div>
                        <div className={styles.playerCardName}>{r.name}</div>
                        <div className={styles.playerCardRating}>{r.rating.toFixed(2)}</div>
                      </div>
                      <div className={`${styles.rankBadge} ${i < 3 ? styles.rankBadgeTop : ''}`}>#{i + 1}</div>
                    </div>
                    <RatingChart history={stats.ratingHistory} />
                    <div className={styles.statRow}>
                      <div className={styles.statBox}>
                        <div className={styles.statVal} style={{ color: 'var(--green-light)' }}>{stats.wins}</div>
                        <div className={styles.statLbl}>Wins</div>
                      </div>
                      <div className={styles.statBox}>
                        <div className={styles.statVal} style={{ color: 'var(--red)' }}>{stats.losses}</div>
                        <div className={styles.statLbl}>Losses</div>
                      </div>
                      <div className={styles.statBox}>
                        <div className={styles.statVal}>{stats.winRate}%</div>
                        <div className={styles.statLbl}>Win rate</div>
                      </div>
                      <div className={styles.statBox}>
                        <div className={styles.statVal}>{stats.gamesPlayed}</div>
                        <div className={styles.statLbl}>Played</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {tab === 'players' && selected && selectedStats && (
            <div>
              <button className={styles.back} onClick={() => setSelected(null)}>← Back</button>
              <div className={styles.detailHeader}>
                <div className={styles.avatar} style={{ background: avatarColor(selected).bg, color: avatarColor(selected).color, width: 52, height: 52, fontSize: '1rem' }}>
                  {initials(selected)}
                </div>
                <div>
                  <h2 className={styles.detailName}>{selected}</h2>
                  <div className={styles.detailRating}>
                    {allRatings.find(r => r.name === selected)?.rating.toFixed(2)} UTR
                  </div>
                </div>
                <div className={`${styles.streakBadge} ${selectedStats.streak.type === 'W' ? styles.streakW : selectedStats.streak.type === 'L' ? styles.streakL : styles.streakD}`}>
                  {selectedStats.streak.count}{selectedStats.streak.type} streak
                </div>
              </div>

              {/* Rating over time */}
              <div className={styles.detailCard}>
                <div className={styles.detailCardTitle}>Rating over time</div>
                <RatingChart history={selectedStats.ratingHistory} />
              </div>

              {/* Key stats */}
              <div className={styles.statsGrid}>
                <div className={styles.detailCard}>
                  <div className={styles.detailCardTitle}>Record</div>
                  <div className={styles.bigStatRow}>
                    <div className={styles.bigStat}><span style={{ color: 'var(--green-light)' }}>{selectedStats.wins}W</span></div>
                    <div className={styles.bigStat}><span style={{ color: 'var(--red)' }}>{selectedStats.losses}L</span></div>
                    {selectedStats.draws > 0 && <div className={styles.bigStat}><span style={{ color: 'var(--text2)' }}>{selectedStats.draws}D</span></div>}
                  </div>
                  <div className={styles.winBar}>
                    <div className={styles.winBarFill} style={{ width: `${selectedStats.winRate}%` }} />
                  </div>
                  <div className={styles.winBarLabel}>{selectedStats.winRate}% win rate</div>
                </div>
                <div className={styles.detailCard}>
                  <div className={styles.detailCardTitle}>Games</div>
                  <div className={styles.bigStatRow}>
                    <div className={styles.bigStat}><span style={{ color: 'var(--gold2)' }}>{selectedStats.totalGamesWon}</span><div className={styles.bigStatLbl}>Won</div></div>
                    <div className={styles.bigStat}><span style={{ color: 'var(--text3)' }}>{selectedStats.totalGamesLost}</span><div className={styles.bigStatLbl}>Lost</div></div>
                  </div>
                  <div className={styles.winBarLabel}>
                    {selectedStats.totalGamesWon + selectedStats.totalGamesLost > 0
                      ? `${Math.round(selectedStats.totalGamesWon / (selectedStats.totalGamesWon + selectedStats.totalGamesLost) * 100)}% games won`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Partners */}
              <div className={styles.detailCard}>
                <div className={styles.detailCardTitle}>Partners</div>
                {Object.entries(selectedStats.partners)
                  .sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))
                  .map(([name, rec]) => {
                    const total = rec.wins + rec.losses
                    const wr = total > 0 ? Math.round(rec.wins / total * 100) : 0
                    const av = avatarColor(name)
                    return (
                      <div key={name} className={styles.partnerRow}>
                        <div className={styles.avatar} style={{ background: av.bg, color: av.color, width: 28, height: 28, fontSize: '0.6rem' }}>{initials(name)}</div>
                        <div className={styles.partnerName}>{name}</div>
                        <div className={styles.partnerRecord}>
                          <span style={{ color: 'var(--green-light)' }}>{rec.wins}W</span>
                          <span style={{ color: 'var(--text3)' }}>/</span>
                          <span style={{ color: 'var(--red)' }}>{rec.losses}L</span>
                        </div>
                        <div className={styles.miniBar}>
                          <div className={styles.miniBarFill} style={{ width: `${wr}%` }} />
                        </div>
                        <div className={styles.partnerWr}>{wr}%</div>
                      </div>
                    )
                  })}
              </div>

              {/* Best win */}
              {selectedStats.bestWin && (
                <div className={styles.detailCard}>
                  <div className={styles.detailCardTitle}>Notable win</div>
                  <div className={styles.bestWin}>
                    <div className={styles.bestWinScore}>{selectedStats.bestWin.score}</div>
                    <div className={styles.bestWinOpp}>vs {selectedStats.bestWin.opponent}</div>
                    <div className={styles.bestWinDate}>{selectedStats.bestWin.date}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'pairs' && (
            <div className={styles.pairsGrid}>
              {pairStats.map((p) => {
                const [p1, p2] = p.pair.split(' / ')
                const av1 = avatarColor(p1), av2 = avatarColor(p2)
                return (
                  <div key={p.pair} className={styles.pairCard}>
                    <div className={styles.pairAvatars}>
                      <div className={styles.avatar} style={{ background: av1.bg, color: av1.color }}>{initials(p1)}</div>
                      <div className={styles.avatar} style={{ background: av2.bg, color: av2.color, marginLeft: -10 }}>{initials(p2)}</div>
                      <div className={styles.pairNames}>{p1} & {p2}</div>
                    </div>
                    <div className={styles.statRow} style={{ marginTop: '1rem' }}>
                      <div className={styles.statBox}>
                        <div className={styles.statVal} style={{ color: 'var(--green-light)' }}>{p.wins}</div>
                        <div className={styles.statLbl}>Wins</div>
                      </div>
                      <div className={styles.statBox}>
                        <div className={styles.statVal} style={{ color: 'var(--red)' }}>{p.losses}</div>
                        <div className={styles.statLbl}>Losses</div>
                      </div>
                      <div className={styles.statBox}>
                        <div className={styles.statVal}>{p.winRate}%</div>
                        <div className={styles.statLbl}>Win rate</div>
                      </div>
                      <div className={styles.statBox}>
                        <div className={styles.statVal}>{p.total}</div>
                        <div className={styles.statLbl}>Played</div>
                      </div>
                    </div>
                    <div className={styles.winBar} style={{ marginTop: '0.75rem' }}>
                      <div className={styles.winBarFill} style={{ width: `${p.winRate}%` }} />
                    </div>
                  </div>
                )
              })}
              {pairStats.length === 0 && (
                <div className={styles.empty}>Not enough pair data yet — pairs need at least 2 matches together.</div>
              )}
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