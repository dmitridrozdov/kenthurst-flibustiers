'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import styles from './weather.module.css'

// Kenthurst, NSW coordinates
const LAT = -33.6833
const LON = 151.0167

interface HourlyData {
  time: string[]
  precipitation_probability: number[]
  precipitation: number[]
  weathercode: number[]
  temperature_2m: number[]
  windspeed_10m: number[]
  winddirection_10m: number[]
}

interface DailyData {
  time: string[]
  weathercode: number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_sum: number[]
  precipitation_probability_max: number[]
  windspeed_10m_max: number[]
}

interface WeatherData {
  hourly: HourlyData
  daily: DailyData
}

function weatherLabel(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 2) return 'Partly Cloudy'
  if (code === 3) return 'Overcast'
  if (code <= 49) return 'Foggy'
  if (code <= 55) return 'Drizzle'
  if (code <= 65) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Showers'
  if (code <= 86) return 'Snow Showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Unknown'
}

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '⛅'
  if (code === 3) return '☁️'
  if (code <= 49) return '🌫️'
  if (code <= 55) return '🌦️'
  if (code <= 65) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌦️'
  if (code <= 86) return '🌨️'
  if (code <= 99) return '⛈️'
  return '🌡️'
}

function windDirection(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

function rainRisk(prob: number): { label: string; cls: string } {
  if (prob >= 70) return { label: 'High risk', cls: 'riskHigh' }
  if (prob >= 40) return { label: 'Moderate', cls: 'riskMed' }
  if (prob >= 20) return { label: 'Low risk', cls: 'riskLow' }
  return { label: 'Unlikely', cls: 'riskNone' }
}

function formatHour(timeStr: string): string {
  const d = new Date(timeStr)
  const h = d.getHours()
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h > 12 ? `${h - 12}pm` : `${h}am`
}

function formatDay(timeStr: string): string {
  return new Date(timeStr).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function isToday(timeStr: string): boolean {
  const d = new Date(timeStr)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function isTomorrow(timeStr: string): boolean {
  const d = new Date(timeStr)
  const tom = new Date()
  tom.setDate(tom.getDate() + 1)
  return d.toDateString() === tom.toDateString()
}

function dayLabel(timeStr: string): string {
  if (isToday(timeStr)) return 'Today'
  if (isTomorrow(timeStr)) return 'Tomorrow'
  return formatDay(timeStr)
}

export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updated, setUpdated] = useState<string>('')

  useEffect(() => {
    async function fetchWeather() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,precipitation_probability,precipitation,weathercode,windspeed_10m,winddirection_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max&timezone=Australia%2FSydney&forecast_days=7`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setWeather(data)
        setUpdated(new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }))
      } catch (e) {
        setError('Unable to load weather data.')
      } finally {
        setLoading(false)
      }
    }
    fetchWeather()
    const id = setInterval(fetchWeather, 15 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  if (loading) return (
    <>
      <Nav />
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
        Loading weather for Kenthurst…
      </div>
    </>
  )

  if (error || !weather) return (
    <>
      <Nav />
      <div className={styles.loading}>{error}</div>
    </>
  )

  const now = new Date()
  const currentHourIdx = weather.hourly.time.findIndex(t => {
    const d = new Date(t)
    return d >= now && isToday(t)
  })
  const startIdx = currentHourIdx >= 0 ? currentHourIdx : 0

  // next 12 hours
  const next12 = weather.hourly.time
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => new Date(t) >= now)
    .slice(0, 12)

  // today's rain windows — consecutive hours with precip prob >= 30
  const todayHours = weather.hourly.time
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => isToday(t) && new Date(t) >= now)

  const rainWindows: { from: string; to: string; maxProb: number; maxMm: number }[] = []
  let windowStart: number | null = null
  let windowMaxProb = 0
  let windowMaxMm = 0

  todayHours.forEach(({ t, i }, idx) => {
    const prob = weather.hourly.precipitation_probability[i]
    const mm = weather.hourly.precipitation[i]
    if (prob >= 30) {
      if (windowStart === null) { windowStart = i; windowMaxProb = prob; windowMaxMm = mm }
      else { windowMaxProb = Math.max(windowMaxProb, prob); windowMaxMm = Math.max(windowMaxMm, mm) }
    } else {
      if (windowStart !== null) {
        rainWindows.push({ from: weather.hourly.time[windowStart], to: t, maxProb: windowMaxProb, maxMm: windowMaxMm })
        windowStart = null; windowMaxProb = 0; windowMaxMm = 0
      }
    }
  })
  if (windowStart !== null) {
    const last = todayHours[todayHours.length - 1]
    rainWindows.push({ from: weather.hourly.time[windowStart], to: last.t, maxProb: windowMaxProb, maxMm: windowMaxMm })
  }

  const currentCode = weather.hourly.weathercode[startIdx]
  const currentTemp = weather.hourly.temperature_2m[startIdx]
  const currentWind = weather.hourly.windspeed_10m[startIdx]
  const currentWindDir = weather.hourly.winddirection_10m[startIdx]
  const currentPrec = weather.hourly.precipitation_probability[startIdx]

  const todayDaily = weather.daily.time.findIndex(t => isToday(t))
  const maxTemp = weather.daily.temperature_2m_max[todayDaily]
  const minTemp = weather.daily.temperature_2m_min[todayDaily]
  const totalRain = weather.daily.precipitation_sum[todayDaily]

  return (
    <>
      <Nav />
      <main>
        <div className={styles.section}>

          {/* HEADER */}
          <div className={styles.pageHeader}>
            <div>
              <div className={styles.location}>📍 Kenthurst, NSW</div>
              <h1 className={styles.title}>Court Weather</h1>
            </div>
            <div className={styles.updated}>Updated {updated}</div>
          </div>

          {/* CURRENT CONDITIONS */}
          <div className={styles.currentCard}>
            <div className={styles.currentLeft}>
              <div className={styles.currentEmoji}>{weatherEmoji(currentCode)}</div>
              <div>
                <div className={styles.currentTemp}>{Math.round(currentTemp)}°C</div>
                <div className={styles.currentLabel}>{weatherLabel(currentCode)}</div>
                <div className={styles.currentRange}>↑{Math.round(maxTemp)}° ↓{Math.round(minTemp)}°</div>
              </div>
            </div>
            <div className={styles.currentRight}>
              <div className={styles.currentStat}>
                <div className={styles.currentStatIcon}>💧</div>
                <div>
                  <div className={styles.currentStatVal}>{currentPrec}%</div>
                  <div className={styles.currentStatLbl}>Rain chance</div>
                </div>
              </div>
              <div className={styles.currentStat}>
                <div className={styles.currentStatIcon}>💨</div>
                <div>
                  <div className={styles.currentStatVal}>{Math.round(currentWind)} km/h {windDirection(currentWindDir)}</div>
                  <div className={styles.currentStatLbl}>Wind</div>
                </div>
              </div>
              <div className={styles.currentStat}>
                <div className={styles.currentStatIcon}>🌧️</div>
                <div>
                  <div className={styles.currentStatVal}>{totalRain.toFixed(1)} mm</div>
                  <div className={styles.currentStatLbl}>Total today</div>
                </div>
              </div>
            </div>
          </div>

          {/* RAIN WINDOWS */}
          {rainWindows.length > 0 ? (
            <div className={styles.rainAlert}>
              <div className={styles.rainAlertTitle}>⚠️ Rain expected today</div>
              {rainWindows.map((w, i) => (
                <div key={i} className={styles.rainWindow}>
                  <div className={styles.rainWindowTime}>
                    {formatHour(w.from)} – {formatHour(w.to)}
                  </div>
                  <div className={styles.rainWindowDetails}>
                    <span className={`${styles.rainProb} ${styles[rainRisk(w.maxProb).cls]}`}>
                      {w.maxProb}% chance
                    </span>
                    <span className={styles.rainMm}>up to {w.maxMm.toFixed(1)} mm</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.clearAlert}>
              ✅ No significant rain expected today — courts should be good!
            </div>
          )}

          {/* HOURLY STRIP */}
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Next 12 Hours</h2>
          </div>
          <div className={styles.hourlyStrip}>
            {next12.map(({ t, i }) => {
              const prob = weather.hourly.precipitation_probability[i]
              const temp = weather.hourly.temperature_2m[i]
              const code = weather.hourly.weathercode[i]
              const mm = weather.hourly.precipitation[i]
              const isNow = i === startIdx
              return (
                <div key={t} className={`${styles.hourCard} ${isNow ? styles.hourCardNow : ''}`}>
                  <div className={styles.hourTime}>{isNow ? 'Now' : formatHour(t)}</div>
                  <div className={styles.hourEmoji}>{weatherEmoji(code)}</div>
                  <div className={styles.hourTemp}>{Math.round(temp)}°</div>
                  <div className={`${styles.hourProb} ${prob >= 50 ? styles.hourProbHigh : prob >= 20 ? styles.hourProbMed : styles.hourProbLow}`}>
                    {prob}%
                  </div>
                  {mm > 0 && <div className={styles.hourMm}>{mm.toFixed(1)}mm</div>}
                </div>
              )
            })}
          </div>

          {/* 7-DAY FORECAST */}
          <div className={styles.sectionHeader} style={{ marginTop: '2rem' }}>
            <h2 className={styles.sectionTitle}>7-Day Forecast</h2>
          </div>
          <div className={styles.dailyList}>
            {weather.daily.time.map((t, i) => {
              const code = weather.daily.weathercode[i]
              const max = weather.daily.temperature_2m_max[i]
              const min = weather.daily.temperature_2m_min[i]
              const rain = weather.daily.precipitation_sum[i]
              const prob = weather.daily.precipitation_probability_max[i]
              const wind = weather.daily.windspeed_10m_max[i]
              const risk = rainRisk(prob)
              const today = isToday(t)
              return (
                <div key={t} className={`${styles.dayRow} ${today ? styles.dayRowToday : ''}`}>
                  <div className={styles.dayLabel}>{dayLabel(t)}</div>
                  <div className={styles.dayEmoji}>{weatherEmoji(code)}</div>
                  <div className={styles.dayCondition}>{weatherLabel(code)}</div>
                  <div className={styles.dayTemps}>
                    <span className={styles.dayMax}>{Math.round(max)}°</span>
                    <span className={styles.dayMin}>{Math.round(min)}°</span>
                  </div>
                  <div className={styles.dayRain}>
                    <span className={`${styles.dayProb} ${styles[risk.cls]}`}>{prob}%</span>
                    <span className={styles.dayMm}>{rain.toFixed(1)}mm</span>
                  </div>
                  <div className={styles.dayWind}>💨 {Math.round(wind)} km/h</div>
                  <div className={`${styles.courtBadge} ${prob >= 70 ? styles.courtBad : prob >= 40 ? styles.courtMaybe : styles.courtGood}`}>
                    {prob >= 70 ? 'Likely off' : prob >= 40 ? 'Monitor' : 'Court ready'}
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </main>
      <footer className={styles.footer}>
        © 2026 <em>The Kenthurst Flibustiers</em> · Weather via Open-Meteo
      </footer>
    </>
  )
}