import WaitlistForm from '@/components/WaitlistForm'
import styles from './page.module.css'

export default function Page() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.wordmark}>SHAi</h1>
        <p className={styles.tagline}>Small Happy Appetites, Incorporated!</p>
        <p className={styles.description}>
          The companion for every feed, meal, and milestone — from newborn to first day of school. Built by parents who wished they&apos;d had this.
        </p>
        <div className={styles.card}>
          <p className={styles.cardLabel}>Be among the first parents to try SHAi.</p>
          <WaitlistForm />
        </div>
      </div>
    </main>
  )
}
