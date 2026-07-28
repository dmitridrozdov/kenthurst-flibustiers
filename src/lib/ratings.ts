import { Match, PlayerRating } from './types'

const ACTIVITY_WINDOW_DAYS = 60
const ACTIVITY_RATE = 0.03
const ACTIVITY_CAP = 0.30
const STARTING_RATING = 4.0
const MAX_RATING = 16.5
const K = 0.15
const VETERAN_K = 0.10
const VETERAN_THRESHOLD = 20

function daysBetween(dateStr: string): number {
  const now = new Date()
  const matchDate = new Date(dateStr)
  return Math.floor((now.getTime() - matchDate.getTime()) / (1000 * 60 * 60 * 24))
}

function activityMultiplier(recentGames: number): number {
  return 1 + Math.min(ACTIVITY_CAP, recentGames * ACTIVITY_RATE)
}

function kFactor(gamesPlayed: number): number {
  return gamesPlayed >= VETERAN_THRESHOLD ? VETERAN_K : K
}

function parseGames(score: string): { winnerGames: number; loserGames: number } {
  let winnerGames = 0
  let loserGames = 0
  const sets = score.split(',').map(s => s.trim())
  for (const set of sets) {
    const clean = set.replace(/\(\d+\)/g, '').replace(/\s*draw\s*/gi, '')
    const parts = clean.split('-').map(n => parseInt(n))
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      winnerGames += parts[0]
      loserGames += parts[1]
    }
  }
  return { winnerGames, loserGames }
}

function performance(gamesWon: number, gamesLost: number): number {
  const total = gamesWon + gamesLost
  if (total === 0) return STARTING_RATING
  const ratio = gamesWon / total
  return MAX_RATING * Math.pow(ratio, 1.2)
}

function isDraw(score: string, wg: number, lg: number): boolean {
  return score.toLowerCase().includes('draw') || wg === lg
}

export function calculateRatings(players: string[], matches: Match[]): PlayerRating[] {
  const ratings: Record<string, number> = {}
  const gamesPlayed: Record<string, number> = {}
  const recentGames: Record<string, number> = {}

  players.forEach((p) => {
    ratings[p] = STARTING_RATING
    gamesPlayed[p] = 0
    recentGames[p] = 0
  })

  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date))
  const latestDate = sorted[sorted.length - 1]?.date ?? ''
  const prevRatings: Record<string, number> = { ...ratings }

  sorted.forEach((match, idx) => {
    const { winner, partner1, loser, partner2, date } = match

    ;[winner, partner1, loser, partner2].forEach((p) => {
      if (!(p in ratings)) {
        ratings[p] = STARTING_RATING
        gamesPlayed[p] = 0
        recentGames[p] = 0
      }
    })

    const isRecent = daysBetween(date) <= ACTIVITY_WINDOW_DAYS
    const { winnerGames, loserGames } = parseGames(match.score)
    const draw = isDraw(match.score, winnerGames, loserGames)

    if (match.date === latestDate && sorted[idx - 1]?.date !== latestDate) {
      Object.assign(prevRatings, ratings)
    }

    if (draw) {
      // draw: both teams move toward the midpoint of their current ratings
      const teamAAvg = (ratings[winner] + ratings[partner1]) / 2
      const teamBAvg = (ratings[loser] + ratings[partner2]) / 2
      const midpoint = (teamAAvg + teamBAvg) / 2

      ;[winner, partner1].forEach((p) => {
        const k = kFactor(gamesPlayed[p])
        ratings[p] = parseFloat((ratings[p] + k * (midpoint - ratings[p])).toFixed(2))
        gamesPlayed[p]++
        if (isRecent) recentGames[p]++
      })

      ;[loser, partner2].forEach((p) => {
        const k = kFactor(gamesPlayed[p])
        ratings[p] = parseFloat((ratings[p] + k * (midpoint - ratings[p])).toFixed(2))
        gamesPlayed[p]++
        if (isRecent) recentGames[p]++
      })
    } else {
      const winPerf = performance(winnerGames, loserGames)
      const losePerf = performance(loserGames, winnerGames)

      ;[winner, partner1].forEach((p) => {
        const mult = activityMultiplier(recentGames[p])
        const k = kFactor(gamesPlayed[p])
        ratings[p] = parseFloat(Math.min(MAX_RATING, ratings[p] + k * mult * (winPerf - ratings[p])).toFixed(2))
        gamesPlayed[p]++
        if (isRecent) recentGames[p]++
      })

      ;[loser, partner2].forEach((p) => {
        const mult = activityMultiplier(recentGames[p])
        const k = kFactor(gamesPlayed[p])
        // asymmetric: activity softens losses
        ratings[p] = parseFloat(Math.max(1.0, ratings[p] + k * (1 / mult) * (losePerf - ratings[p])).toFixed(2))
        gamesPlayed[p]++
        if (isRecent) recentGames[p]++
      })
    }
  })

  return players
    .filter((p) => p in ratings)
    .map((p) => ({
      name: p,
      rating: ratings[p],
      gamesPlayed: gamesPlayed[p],
      recentGames: recentGames[p],
      activityMultiplier: activityMultiplier(recentGames[p]),
      ratingChange: parseFloat((ratings[p] - prevRatings[p]).toFixed(2)),
    }))
    .sort((a, b) => b.rating - a.rating)
}

export function calculateRatingsPure(players: string[], matches: Match[]): PlayerRating[] {
  const ratings: Record<string, number> = {}
  const gamesPlayed: Record<string, number> = {}
  const recentGames: Record<string, number> = {}

  players.forEach((p) => {
    ratings[p] = STARTING_RATING
    gamesPlayed[p] = 0
    recentGames[p] = 0
  })

  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date))
  const latestDate = sorted[sorted.length - 1]?.date ?? ''
  const prevRatings: Record<string, number> = { ...ratings }

  sorted.forEach((match, idx) => {
    const { winner, partner1, loser, partner2, date } = match

    ;[winner, partner1, loser, partner2].forEach((p) => {
      if (!(p in ratings)) {
        ratings[p] = STARTING_RATING
        gamesPlayed[p] = 0
        recentGames[p] = 0
      }
    })

    const isRecent = daysBetween(date) <= ACTIVITY_WINDOW_DAYS
    const { winnerGames, loserGames } = parseGames(match.score)
    const draw = isDraw(match.score, winnerGames, loserGames)

    if (match.date === latestDate && sorted[idx - 1]?.date !== latestDate) {
      Object.assign(prevRatings, ratings)
    }

    if (draw) {
      const teamAAvg = (ratings[winner] + ratings[partner1]) / 2
      const teamBAvg = (ratings[loser] + ratings[partner2]) / 2
      const midpoint = (teamAAvg + teamBAvg) / 2

      ;[winner, partner1, loser, partner2].forEach((p) => {
        const k = kFactor(gamesPlayed[p])
        ratings[p] = parseFloat((ratings[p] + k * (midpoint - ratings[p])).toFixed(2))
        gamesPlayed[p]++
        if (isRecent) recentGames[p]++
      })
    } else {
      const winPerf = performance(winnerGames, loserGames)
      const losePerf = performance(loserGames, winnerGames)

      ;[winner, partner1].forEach((p) => {
        const k = kFactor(gamesPlayed[p])
        ratings[p] = parseFloat(Math.min(MAX_RATING, ratings[p] + k * (winPerf - ratings[p])).toFixed(2))
        gamesPlayed[p]++
        if (isRecent) recentGames[p]++
      })

      ;[loser, partner2].forEach((p) => {
        const k = kFactor(gamesPlayed[p])
        ratings[p] = parseFloat(Math.max(1.0, ratings[p] + k * (losePerf - ratings[p])).toFixed(2))
        gamesPlayed[p]++
        if (isRecent) recentGames[p]++
      })
    }
  })

  return players
    .filter((p) => p in ratings)
    .map((p) => ({
      name: p,
      rating: ratings[p],
      gamesPlayed: gamesPlayed[p],
      recentGames: recentGames[p],
      activityMultiplier: activityMultiplier(recentGames[p]),
      ratingChange: parseFloat((ratings[p] - prevRatings[p]).toFixed(2)),
    }))
    .sort((a, b) => b.rating - a.rating)
}