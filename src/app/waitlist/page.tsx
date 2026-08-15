import WaitlistForm from '@/components/WaitlistForm'
import SHAiPresence from '@/components/SHAiPresence'
import SHAiBrand from '@/components/SHAiBrand'
import styles from './page.module.css'

export default function WaitlistPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <SHAiPresence expression="celebrating" size={71} />
          <SHAiBrand expression="celebrating" width={200} />
        </div>

        <h1 className={styles.headline}>From their very first feed to a lifetime of good eating.</h1>
        <p className={styles.sub}>
          Every feed, meal, and milestone — tracked, understood, and yours to keep forever.
        </p>

        <div className={styles.card}>
          <WaitlistForm />
        </div>

        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🍼</span>
            <span>Newborn feeds through to family meals — one place, forever</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🌱</span>
            <span>Iron, calcium, vitamins — tracked automatically as they grow</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>📖</span>
            <span>A baby book that builds itself — yours to look back on, forever</span>
          </div>
        </div>

        <div className={styles.demoWrap}>
          <img
            src="/shai-demo.gif"
            alt="SHAi logging a meal in seconds"
            className={styles.demo}
          />
        </div>

        <p className={styles.trust}>Free during beta &middot; No spam &middot; We&apos;ll let you know when you&apos;re in</p>
      </div>
    </main>
  )
}
