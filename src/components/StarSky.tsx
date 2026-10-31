'use client'

import { useEffect, useRef } from 'react'
import styles from './StarSky.module.css'

interface Star {
  x: number
  y: number
  r: number
  base: number
  phase: number
  speed: number
  tint: string
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  len: number
  life: number
  maxLife: number
  width: number
}

const STAR_DENSITY = 1 / 3500 // stars per css pixel²
const STAR_TINTS = ['255,255,255', '210,225,255', '255,240,210', '190,210,255']
const METEOR_MIN_GAP = 2500
const METEOR_MAX_GAP = 7000

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export default function StarSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let stars: Star[] = []
    const meteors: Meteor[] = []
    let nextMeteorAt = performance.now() + rand(800, 2500)
    let lastTime = performance.now()
    let frame = 0

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.round(width * height * STAR_DENSITY)
      stars = Array.from({ length: count }, () => {
        const big = Math.random() < 0.08
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r: big ? rand(1.1, 1.7) : rand(0.3, 1.0),
          base: big ? rand(0.7, 1) : rand(0.25, 0.75),
          phase: Math.random() * Math.PI * 2,
          speed: rand(0.4, 1.6),
          tint: STAR_TINTS[Math.floor(Math.random() * STAR_TINTS.length)],
        }
      })
    }

    function spawnMeteor() {
      // enter from the top or right edge and drift down-left at a gentle angle
      const angle = rand(Math.PI * 0.68, Math.PI * 0.8)
      const speed = rand(90, 170) // px per second — slow on purpose
      const fromTop = Math.random() < 0.6
      const maxLife = rand(4, 7)
      meteors.push({
        x: fromTop ? rand(width * 0.3, width * 1.1) : width + 20,
        y: fromTop ? -20 : rand(0, height * 0.5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: rand(120, 260),
        life: 0,
        maxLife,
        width: rand(1, 2),
      })
    }

    function drawStars(t: number) {
      for (const s of stars) {
        const twinkle = reducedMotion ? 1 : 0.65 + 0.35 * Math.sin(t * 0.001 * s.speed + s.phase)
        const alpha = s.base * twinkle
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${s.tint},${alpha})`
        ctx!.fill()
        if (s.r > 1.1) {
          ctx!.beginPath()
          ctx!.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2)
          ctx!.fillStyle = `rgba(${s.tint},${alpha * 0.08})`
          ctx!.fill()
        }
      }
    }

    function drawMeteors(dt: number) {
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        m.life += dt
        m.x += m.vx * dt
        m.y += m.vy * dt

        // fade in, glide, fade out
        const p = m.life / m.maxLife
        const alpha = p < 0.15 ? p / 0.15 : p > 0.7 ? Math.max(0, (1 - p) / 0.3) : 1

        const speed = Math.hypot(m.vx, m.vy)
        const tailX = m.x - (m.vx / speed) * m.len
        const tailY = m.y - (m.vy / speed) * m.len
        const grad = ctx!.createLinearGradient(m.x, m.y, tailX, tailY)
        grad.addColorStop(0, `rgba(255,250,235,${0.9 * alpha})`)
        grad.addColorStop(0.25, `rgba(232,204,110,${0.35 * alpha})`)
        grad.addColorStop(1, 'rgba(232,204,110,0)')

        ctx!.strokeStyle = grad
        ctx!.lineWidth = m.width
        ctx!.lineCap = 'round'
        ctx!.beginPath()
        ctx!.moveTo(m.x, m.y)
        ctx!.lineTo(tailX, tailY)
        ctx!.stroke()

        ctx!.beginPath()
        ctx!.arc(m.x, m.y, m.width * 1.4, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(255,255,255,${alpha})`
        ctx!.shadowColor = 'rgba(255,240,200,0.9)'
        ctx!.shadowBlur = 10
        ctx!.fill()
        ctx!.shadowBlur = 0

        if (m.life >= m.maxLife) meteors.splice(i, 1)
      }
    }

    function render(t: number) {
      const dt = Math.min(0.05, (t - lastTime) / 1000)
      lastTime = t
      ctx!.clearRect(0, 0, width, height)
      drawStars(t)

      if (t >= nextMeteorAt && !document.hidden) {
        spawnMeteor()
        nextMeteorAt = t + rand(METEOR_MIN_GAP, METEOR_MAX_GAP)
      }
      drawMeteors(dt)
      frame = requestAnimationFrame(render)
    }

    resize()
    window.addEventListener('resize', resize)
    if (reducedMotion) drawStars(0)
    else frame = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className={styles.sky} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
