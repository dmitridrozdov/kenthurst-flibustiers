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
  return new Date(timeStr).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function isToday(timeStr: string): boolean {
  return new Date(timeStr).toDateString() === new Date().toDateString()
}

function isTomorrow(timeStr: string): boolean {
  const tom = new Date()
  tom.setDate(tom.getDate() + 1)
  return new Date(timeStr).toDateString() === tom.toDateString()
}

function dayLabel(timeStr: string): string {
  if (isToday(timeStr)) return 'Today'
  if (isTomorrow(timeStr)) return 'Tomorrow'
  return formatDay(timeStr)
}

// ── HOURLY CHART ──────────────────────────────────────────────
function HourlyChart({ hours }: {
  hours: { time: string; temp: number; prob: number; mm: number; code: number; wind: number }[]
}) {
  const W = 900
  const H = 160
  const PAD = { top: 24, bottom: 40, left: 36, right: 16 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const temps = hours.map(h => h.temp)
  const minT = Math.min(...temps) - 2
  const maxT = Math.max(...temps) + 2

  const tx = (i: number) => PAD.left + (i / (hours.length - 1)) * innerW
  const ty = (t: number) => PAD.top + (1 - (t - minT) / (maxT - minT)) * innerH
  const py = (p: number) => PAD.top + (1 - p / 100) * innerH

  const tempPath = hours.map((h, i) => `${i === 0 ? 'M' : 'L'} ${tx(i)} ${ty(h.temp)}`).join(' ')
  const tempArea = `${tempPath} L ${tx(hours.length - 1)} ${H - PAD.bottom} L ${tx(0)} ${H - PAD.bottom} Z`
  const barW = Math.max(4, (innerW / hours.length) * 0.55)

  const now = new Date()
  const nowIdx = hours.findIndex(h => new Date(h.time) >= now)

  return (
    <div className={styles.chartContainer}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.hourlyChart}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8cc6e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#e8cc6e" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a82b8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#4a82b8" stopOpacity="0.15" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        {/* grid lines */}
        {[0, 25, 50, 75, 100].map(p => (
          <line
            key={p}
            x1={PAD.left} y1={py(p)}
            x2={W - PAD.right} y2={py(p)}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
        ))}

        {/* rain bars */}
        <g clipPath="url(#chartClip)">
          {hours.map((h, i) => {
            if (h.prob === 0) return null
            const bh = (h.prob / 100) * innerH
            return (
              <rect
                key={i}
                x={tx(i) - barW / 2}
                y={PAD.top + innerH - bh}
                width={barW}
                height={bh}
                fill="url(#rainGrad)"
                rx="2"
              />
            )
          })}
        </g>

        {/* temp area */}
        <path d={tempArea} fill="url(#tempGrad)" clipPath="url(#chartClip)" />

        {/* temp line */}
        <path
          d={tempPath}
          fill="none"
          stroke="#e8cc6e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath="url(#chartClip)"
        />

        {/* now marker */}
        {nowIdx >= 0 && (
          <line
            x1={tx(nowIdx)} y1={PAD.top}
            x2={tx(nowIdx)} y2={H - PAD.bottom}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* temp dots + labels every 3h */}
        {hours.map((h, i) => {
          if (i % 3 !== 0) return null
          const x = tx(i)
          const y = ty(h.temp)
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="3.5" fill="#1e304e" />
              <circle cx={x} cy={y} r="2.5" fill="#e8cc6e" opacity="0.95" />
              <text
                x={x} y={y - 9}
                textAnchor="middle"
                fill="#e8cc6e"
                fontSize="9"
                fontFamily="Ubuntu, sans-serif"
                fontWeight="600"
              >
                {h.temp}°
              </text>
            </g>
          )
        })}

        {/* x-axis time labels */}
        {hours.map((h, i) => {
          if (i % 3 !== 0) return null
          const x = tx(i)
          const hr = new Date(h.time).getHours()
          const isNow = i === nowIdx
          const label = isNow ? 'now'
            : hr === 0 ? 'midnight'
            : hr === 12 ? 'noon'
            : hr > 12 ? `${hr - 12}pm`
            : `${hr}am`
          return (
            <text
              key={i}
              x={x} y={H - 6}
              textAnchor="middle"
              fill={isNow ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.28)'}
              fontSize="9"
              fontFamily="Ubuntu, sans-serif"
              fontWeight={isNow ? '700' : '400'}
            >
              {label}
            </text>
          )
        })}

        {/* y-axis temp labels */}
        {[minT + 1, Math.round((minT + maxT) / 2), maxT - 1].map((t, i) => (
          <text
            key={i}
            x={PAD.left - 5} y={ty(t) + 3}
            textAnchor="end"
            fill="rgba(255,255,255,0.2)"
            fontSize="8"
            fontFamily="Ubuntu, sans-serif"
          >
            {Math.round(t)}°
          </text>
        ))}
      </svg>

      {/* legend */}
      <div className={styles.chartLegend}>
        <div className={styles.legendItem}>
          <div className={styles.legendLine} style={{ background: '#e8cc6e' }} />
          Temperature
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendBar} />
          Rain probability
        </div>
        <div className={styles.legendRight}>
          {hours.filter((_, i) => i % 3 === 0).map((h, i) => (
            h.prob > 0 ? (
              <span
                key={i}
                className={`${styles.probLabel} ${h.prob >= 60 ? styles.probHigh : h.prob >= 30 ? styles.probMed : styles.probLow}`}
              >
                {h.prob}%
              </span>
            ) : null
          ))}
        </div>
      </div>

      {/* icon row */}
      <div className={styles.iconRow}>
        {hours.filter((_, i) => i % 3 === 0).map((h, i) => (
          <div key={i} className={styles.iconCell}>
            <span className={styles.weatherIcon}>{weatherEmoji(h.code)}</span>
            {h.mm > 0 && <span className={styles.mmLabel}>{h.mm.toFixed(1)}mm</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updated, setUpdated] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'forecast' | 'radar'>('forecast')

  useEffect(() => {
    async function fetchWeather() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,precipitation_probability,precipitation,weathercode,windspeed_10m,winddirection_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max&timezone=Australia%2FSydney&forecast_days=7`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setWeather(data)
        setUpdated(new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }))
      } catch {
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
  const currentHourIdx = weather.hourly.time.findIndex(t => new Date(t) >= now)
  const startIdx = currentHourIdx >= 0 ? currentHourIdx : 0

  const next24 = weather.hourly.time
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => new Date(t) >= now)
    .slice(0, 24)

  // today's rain windows
  const todayHours = weather.hourly.time
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => isToday(t) && new Date(t) >= now)

  const rainWindows: { from: string; to: string; maxProb: number; maxMm: number }[] = []
  let windowStart: number | null = null
  let windowMaxProb = 0
  let windowMaxMm = 0

  todayHours.forEach(({ t, i }) => {
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
              <div className={styles.location}>📍 Kenthurst, New South Wales</div>
              <h1 className={styles.title}>Court Weather</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTab === 'forecast' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('forecast')}
                >
                  📊 Forecast
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'radar' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('radar')}
                >
                  🛰 Radar
                </button>
              </div>
              <div className={styles.updated}>Updated {updated}</div>
            </div>
          </div>

          {/* ── FORECAST TAB ── */}
          {activeTab === 'forecast' && (
            <>
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

              {/* 24H CHART */}
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Next 24 Hours</h2>
              </div>
              <HourlyChart
                hours={next24.map(({ t, i }) => ({
                  time: t,
                  temp: Math.round(weather.hourly.temperature_2m[i]),
                  prob: weather.hourly.precipitation_probability[i],
                  mm: weather.hourly.precipitation[i],
                  code: weather.hourly.weathercode[i],
                  wind: Math.round(weather.hourly.windspeed_10m[i]),
                }))}
              />

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
            </>
          )}

          {/* ── RADAR TAB ── */}
          {activeTab === 'radar' && (
            <div className={styles.radarSection}>
              <div className={styles.radarCard}>
                <div className={styles.radarHeader}>
                  <div>
                    <div className={styles.radarTitle}>Sydney (Terrey Hills) Radar</div>
                    <div className={styles.radarSub}>128km · Kenthurst is ~30km NW of the radar · Updates every 6 min</div>
                  </div>
                  <a
                    href="http://www.bom.gov.au/products/IDR713.loop.shtml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.radarExtLink}
                  >
                    Open BOM ↗
                  </a>
                </div>
                <div className={styles.radarFrame}>
                  <iframe
                    src="http://www.bom.gov.au/products/IDR713.loop.shtml"
                    className={styles.radarIframe}
                    title="BOM Sydney Terrey Hills Radar"
                    scrolling="no"
                    frameBorder="0"
                  />
                  <div className={styles.radarOverlay}>
                    <div className={styles.radarPin} title="Kenthurst">
                      <div className={styles.radarPinDot} />
                      <div className={styles.radarPinLabel}>Kenthurst</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.radarLegend}>
                <div className={styles.radarLegendTitle}>Rainfall intensity</div>
                <div className={styles.radarLegendScale}>
                  <div className={styles.radarLegendItem} style={{ background: 'rgba(100,180,255,0.6)' }}>Light</div>
                  <div className={styles.radarLegendItem} style={{ background: 'rgba(50,130,255,0.7)' }}>Moderate</div>
                  <div className={styles.radarLegendItem} style={{ background: 'rgba(0,200,100,0.7)' }}>Heavy</div>
                  <div className={styles.radarLegendItem} style={{ background: 'rgba(255,200,0,0.8)' }}>Very heavy</div>
                  <div className={styles.radarLegendItem} style={{ background: 'rgba(255,60,0,0.8)' }}>Extreme</div>
                </div>
              </div>

              <div className={styles.radarInfo}>
                <div className={styles.radarInfoCard}>
                  <div className={styles.radarInfoIcon}>📡</div>
                  <div>
                    <div className={styles.radarInfoTitle}>Terrey Hills Radar</div>
                    <div className={styles.radarInfoSub}>~30km SE of Kenthurst</div>
                  </div>
                </div>
                <div className={styles.radarInfoCard}>
                  <div className={styles.radarInfoIcon}>🔄</div>
                  <div>
                    <div className={styles.radarInfoTitle}>Updates every 6 min</div>
                    <div className={styles.radarInfoSub}>Loop shows last 60 min</div>
                  </div>
                </div>
                <div className={styles.radarInfoCard}>
                  <div className={styles.radarInfoIcon}>📍</div>
                  <div>
                    <div className={styles.radarInfoTitle}>Hills District</div>
                    <div className={styles.radarInfoSub}>Baulkham Hills to Kenthurst</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
      <footer className={styles.footer}>
        © 2026 <em>The Kenthurst Flibustiers</em> · Weather via Open-Meteo · Radar via BOM
      </footer>
    </>
  )
}