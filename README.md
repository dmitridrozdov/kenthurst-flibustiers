# The Kenthurst Flibustiers 🎾

Tennis club site for The Kenthurst Flibustiers. Built with Next.js 14 + TypeScript, deployed on Vercel.

## How it works

All match data lives in **`data/matches.json`**. The site reads this file at build time (and on each request in dev mode), calculates ELO ratings, and renders everything server-side. No database, no localStorage — just a JSON file you edit and push to Git.

## Updating results

After a session, open `data/matches.json` and add a new entry to the `matches` array:

```json
{
  "id": "m007",
  "date": "2025-05-10",
  "winner": "Alex Carter",
  "partner1": "Jamie Brooks",
  "loser": "Morgan Lee",
  "partner2": "Sam Nguyen",
  "score": "6-3, 7-5",
  "surface": "Hard"
}
```

**Fields:**
- `id` — unique string, just increment (m001, m002…)
- `date` — YYYY-MM-DD format
- `winner` / `partner1` — winning pair
- `loser` / `partner2` — losing pair
- `score` — free text, e.g. `"6-3, 6-4"` or `"6-3, 4-6, 7-5"`
- `surface` — `"Hard"`, `"Grass"`, or `"Clay"`

Then commit and push:
```bash
git add data/matches.json
git commit -m "Add results 10 May"
git push
```

Vercel auto-deploys within ~30 seconds. Ratings recalculate automatically.

## Adding / removing players

Edit the `players` array at the top of `data/matches.json`:

```json
{
  "players": [
    "Alex Carter",
    "Jamie Brooks",
    "New Person"
  ],
  ...
}
```

Players start at rating 1200. Ratings only change once they appear in a match.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. No environment variables needed — just deploy
4. Every `git push` to `main` triggers a new deploy

## Project structure

```
kenthurst-flibustiers/
├── data/
│   └── matches.json        ← EDIT THIS after each session
├── src/
│   ├── app/
│   │   ├── layout.tsx      ← root layout, fonts
│   │   ├── globals.css     ← design tokens
│   │   ├── page.tsx        ← Rankings (home)
│   │   ├── results/        ← Match results list
│   │   └── open/           ← Kenthurst Open page
│   ├── components/
│   │   ├── Nav.tsx         ← sticky navigation
│   │   └── Countdown.tsx   ← Open tournament countdown
│   └── lib/
│       ├── types.ts        ← TypeScript interfaces
│       └── ratings.ts      ← ELO calculation logic
├── next.config.js
├── tsconfig.json
└── package.json
```

## Rating system

- **Base ELO** with K=32 (drops to K=24 after 20 games)
- **Activity multiplier**: `1.0 + min(0.30, recentMatches × 0.03)` — players active in the last 60 days gain/lose points up to 30% faster
- **Doubles**: team rating = average of both partners. Each partner gains/loses individually based on the expected vs actual result
