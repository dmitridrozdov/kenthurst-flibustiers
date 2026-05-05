export interface Match {
  id: string
  date: string
  winner: string
  partner1: string
  loser: string
  partner2: string
  score: string
  surface: 'Hard' | 'Grass' | 'Clay'
}

export interface PlayerRating {
  name: string
  rating: number
  gamesPlayed: number
  recentGames: number
  activityMultiplier: number
  ratingChange: number
}

export interface MatchData {
  players: string[]
  matches: Match[]
}
