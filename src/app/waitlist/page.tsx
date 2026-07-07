import WaitlistForm from '@/components/WaitlistForm'
import SHAiPresence from '@/components/SHAiPresence'
import SHAiBrand from '@/components/SHAiBrand'
import styles from './page.module.css'

export default function WaitlistPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <SHAiPresence expression="default" size={71} />
          <SHAiBrand expression="default" width={200} />
        </div>
        <p className={styles.tagline}>Small Happy Appetites, Incorporated!</p>
        <div className={styles.card}>
          <p className={styles.cardLabel}>Be among the first parents to try SHAi.</p>
          <WaitlistForm />
        </div>
      </div>
    </main>
  )
}
