'use client'

import { useEffect, useState } from 'react'
import styles from './Countdown.module.css'

interface Props {
  targetDate: string
}

function getTimeLeft(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now())
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
  }
}

export default function Countdown({ targetDate }: Props) {
  const target = new Date(targetDate)
  const [time, setTime] = useState(getTimeLeft(target))

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(target)), 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={styles.row}>
      {[
        { value: time.days, label: 'Days' },
        { value: time.hours, label: 'Hours' },
        { value: time.minutes, label: 'Minutes' },
      ].map(({ value, label }) => (
        <div key={label} className={styles.unit}>
          <span className={styles.num}>{value}</span>
          <span className={styles.label}>{label}</span>
        </div>
      ))}
    </div>
  )
}
