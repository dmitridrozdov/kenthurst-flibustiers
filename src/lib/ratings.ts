import { Match, PlayerRating } from './types'

const BASE_K = 32
const VETERAN_K = 24
const VETERAN_THRESHOLD = 20
const ACTIVITY_WINDOW_DAYS = 60
const ACTIVITY_RATE = 0.03
const ACTIVITY_CAP = 0.30
const STARTING_RATING = 1200

function daysBetween(dateStr: string): number {
  const now = new Date()
  const matchDate = new Date(dateStr)
  return Math.floor((now.getTime() - matchDate.getTime()) / (1000 * 60 * 60 * 24))
}

function activityMultiplier(recentGames: number): number {
  return 1 + Math.min(ACTIVITY_CAP, recentGames * ACTIVITY_RATE)
}

function kFactor(gamesPlayed: number): number {
  return gamesPlayed >= VETERAN_THRESHOLD ? VETERAN_K : BASE_K
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

function parseSetScore(score: string): { winnerGames: number; loserGames: number } {
  let winnerGames = 0
  let loserGames = 0
  const sets = score.split(',').map(s => s.trim())
  for (const set of sets) {
    // strip tiebreak annotations like "7-6(4)"
    const clean = set.replace(/\(\d+\)/g, '')
    const parts = clean.split('-').map(n => parseInt(n))
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      winnerGames += parts[0]
      loserGames += parts[1]
    }
  }
  return { winnerGames, loserGames }
}

function dominanceMultiplier(winnerGames: number, loserGames: number): number {
  const total = winnerGames + loserGames
  if (total === 0) return 1.0
  // ranges from 1.0 (even) to 1.5 (total bagel)
  return 0.5 + winnerGames / total
}


export function calculateRatings(players: string[], matches: Match[]): PlayerRating[] {
  // initialise state for each player
  const ratings: Record<string, number> = {}
  const gamesPlayed: Record<string, number> = {}
  const recentGames: Record<string, number> = {}

  players.forEach((p) => {
    ratings[p] = STARTING_RATING
    gamesPlayed[p] = 0
    recentGames[p] = 0
  })

  // sort matches chronologically
  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date))

  // track previous ratings for change display (snapshot before last match)
  const prevRatings: Record<string, number> = { ...ratings }

  sorted.forEach((match, idx) => {
    const { winner, partner1, loser, partner2, date } = match

    // ensure any player appearing in matches but not in players list is initialised
    ;[winner, partner1, loser, partner2].forEach((p) => {
      if (!(p in ratings)) {
        ratings[p] = STARTING_RATING
        gamesPlayed[p] = 0
        recentGames[p] = 0
      }
    })

    const isRecent = daysBetween(date) <= ACTIVITY_WINDOW_DAYS

    const teamAAvg = (ratings[winner] + ratings[partner1]) / 2
    const teamBAvg = (ratings[loser] + ratings[partner2]) / 2
  //   const expected = expectedScore(teamAAvg, teamBAvg)

  //   // snapshot ratings just before the last match for "change" display
  //   if (idx === sorted.length - 2) {
  //     Object.assign(prevRatings, ratings)
  //   }

  //   ;[winner, partner1].forEach((p) => {
  //     const mult = activityMultiplier(recentGames[p])
  //     const K = kFactor(gamesPlayed[p])
  //     const delta = Math.round(K * mult * (1 - expected))
  //     ratings[p] += delta
  //     gamesPlayed[p]++
  //     if (isRecent) recentGames[p]++
  //   })

  //   ;[loser, partner2].forEach((p) => {
  //     const mult = activityMultiplier(recentGames[p])
  //     const K = kFactor(gamesPlayed[p])
  //     const delta = Math.round(K * mult * (0 - expected))
  //     ratings[p] += delta
  //     gamesPlayed[p]++
  //     if (isRecent) recentGames[p]++
  //   })
  // })

    const expected = expectedScore(teamAAvg, teamBAvg)
    const { winnerGames, loserGames } = parseSetScore(match.score)
    const domMult = dominanceMultiplier(winnerGames, loserGames)

    // snapshot ratings just before the last match for "change" display
    if (idx === sorted.length - 2) {
      Object.assign(prevRatings, ratings)
    }

    ;[winner, partner1].forEach((p) => {
      const mult = activityMultiplier(recentGames[p])
      const K = kFactor(gamesPlayed[p])
      const delta = Math.round(K * mult * domMult * (1 - expected))
      ratings[p] += delta
      gamesPlayed[p]++
      if (isRecent) recentGames[p]++
    })

    ;[loser, partner2].forEach((p) => {
      const mult = activityMultiplier(recentGames[p])
      const K = kFactor(gamesPlayed[p])
      const delta = Math.round(K * mult * domMult * (0 - expected))
      ratings[p] += delta
      gamesPlayed[p]++
      if (isRecent) recentGames[p]++
    })
  })
  
  return players
    .filter((p) => p in ratings)
    .map((p) => ({
      name: p,
      rating: ratings[p],
      gamesPlayed: gamesPlayed[p],
      recentGames: recentGames[p],
      activityMultiplier: activityMultiplier(recentGames[p]),
      ratingChange: ratings[p] - prevRatings[p],
    }))
    .sort((a, b) => b.rating - a.rating)
}

