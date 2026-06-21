'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { calculateRatings } from '@/lib/ratings'
import Nav from '@/components/Nav'
import PlayerSelect from '@/components/PlayerSelect'
import styles from './record.module.css'

export default function RecordPage() {
  const playersRaw = useQuery(api.players.list)
  const matches = useQuery(api.matches.list)
  const addMatch = useMutation(api.matches.add)
  const addPlayer = useMutation(api.players.add)

  const [date, setDate] = useState(() => {
    const now = new Date()
    const sydneyDate = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }))
    const year = sydneyDate.getFullYear()
    const month = String(sydneyDate.getMonth() + 1).padStart(2, '0')
    const day = String(sydneyDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })

  const [winner, setWinner] = useState('')
  const [partner1, setPartner1] = useState('')
  const [loser, setLoser] = useState('')
  const [partner2, setPartner2] = useState('')
  const [score, setScore] = useState('')
  const [surface, setSurface] = useState<'Hard' | 'Grass' | 'Clay'>('Grass')
  const [newPlayerName, setNewPlayerName] = useState('')
  const [status, setStatus] = useState('')

  async function handleSubmit() {
    if (!winner || !partner1 || !loser || !partner2 || !score) {
      setStatus('Please fill in all fields.')
      return
    }
    const chosen = new Set([winner, partner1, loser, partner2])
    if (chosen.size < 4) {
      setStatus('All four players must be different.')
      return
    }
    await addMatch({ date, winner, partner1, loser, partner2, score, surface })
    setStatus('Match recorded!')
    setWinner(''); setPartner1(''); setLoser(''); setPartner2(''); setScore('')
    setTimeout(() => setStatus(''), 2500)
  }

  async function handleAddPlayer() {
    const name = newPlayerName.trim()
    if (!name) return
    await addPlayer({ name })
    setNewPlayerName('')
    setStatus(`${name} added.`)
    setTimeout(() => setStatus(''), 2500)
  }

if (playersRaw === undefined || matches === undefined) {
    return (
      <>
        <Nav />
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text2)' }}>Loading…</div>
      </>
    )
  }

  const allRatings = calculateRatings(playersRaw, matches)
  const maxGames = Math.max(...allRatings.map((r) => r.gamesPlayed), 0)
  const threshold = maxGames * 0.3

  const active = allRatings.filter((r) => r.gamesPlayed >= threshold && r.gamesPlayed > 0)
  const provisional = allRatings.filter((r) => r.gamesPlayed > 0 && r.gamesPlayed < threshold)
  const unstarted = allRatings.filter((r) => r.gamesPlayed === 0)

  const players = [...active, ...provisional, ...unstarted].map((r) => r.name)

  return (
    <>
      <Nav />
      <main>
        <div className={styles.section}>
          <h1 className={styles.title}>Record a Match</h1>

          <div className={styles.card}>
            <label className={styles.label}>Date</label>
            <input
              type="date"
              className={styles.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <div className={styles.teamHeader}>Winners</div>
            <PlayerSelect
              players={players}
              value={winner}
              onChange={setWinner}
              placeholder="Player A"
              exclude={[partner1, loser, partner2].filter(Boolean)}
            />
            <PlayerSelect
              players={players}
              value={partner1}
              onChange={setPartner1}
              placeholder="Player B"
              exclude={[winner, loser, partner2].filter(Boolean)}
            />

            <div className={styles.teamHeader}>Losers</div>
            <PlayerSelect
              players={players}
              value={loser}
              onChange={setLoser}
              placeholder="Player A"
              exclude={[winner, partner1, partner2].filter(Boolean)}
            />
            <PlayerSelect
              players={players}
              value={partner2}
              onChange={setPartner2}
              placeholder="Player B"
              exclude={[winner, partner1, loser].filter(Boolean)}
            />

            <label className={styles.label}>Score (e.g. 6-3, 6-4)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="6-3, 7-5"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />

            <button className={styles.btnPrimary} onClick={handleSubmit}>
              Record Match
            </button>
          </div>

          <div className={styles.card}>
            <div className={styles.teamHeader}>Add New Player</div>
            <input
              type="text"
              className={styles.input}
              placeholder="Full name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
            />
            <button className={styles.btnGhost} onClick={handleAddPlayer}>
              Add Player
            </button>
          </div>

          {status && <div className={styles.toast}>{status}</div>}
        </div>
      </main>
    </>
  )
}