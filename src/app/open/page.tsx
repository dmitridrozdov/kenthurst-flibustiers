import Nav from '@/components/Nav'
import Countdown from '@/components/Countdown'
import styles from './open.module.css'

export default function OpenPage() {
  return (
    <>
      <Nav />
      <main>
        <div className={styles.section}>
          {/* Hero */}
          <div className={styles.hero}>
            <span className={styles.trophy}>🎾</span>
            <h1 className={styles.title}>
              Kenthurst <span>Open</span>
            </h1>
            <div className={styles.heroDate}>Est. 2025 · Annual Championship</div>
            <div className={styles.pill}>Coming Soon</div>
            <p className={styles.desc}>
              The inaugural Kenthurst Flibustiers Open — our first official club championship.
              Doubles draws, round-robin group stage, and knockout finals.
              May the best buccaneers win.
            </p>
          </div>

          <Countdown targetDate="2025-11-08" />

          {/* Info grid */}
          <div className={styles.grid}>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Format</div>
              <div className={styles.infoVal}><strong>Round Robin</strong> + Finals</div>
              <p className={styles.infoDesc}>Groups of 4. Top 2 advance to knockout draw.</p>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Category</div>
              <div className={styles.infoVal}><strong>Doubles</strong></div>
              <p className={styles.infoDesc}>Open and Plate draws. Everyone plays multiple matches.</p>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Seeding</div>
              <div className={styles.infoVal}>By <strong>Doubles Rating</strong></div>
              <p className={styles.infoDesc}>Your current ELO determines your seed. Play now to climb!</p>
            </div>
          </div>

          {/* Bracket placeholder */}
          <div className={styles.bracket}>
            <div className={styles.bracketLabel}>Draw — To Be Announced</div>
            <div className={styles.bracketTbd}>
              <div className={styles.tbdLine} />
              <div className={styles.tbdText}>The draw opens once entries close</div>
              <div className={styles.tbdLine} />
            </div>
          </div>
        </div>
      </main>
      <footer className={styles.footer}>
        © 2025 <em>The Kenthurst Flibustiers</em> · Kenthurst, NSW · Play hard, play fair
      </footer>
    </>
  )
}
