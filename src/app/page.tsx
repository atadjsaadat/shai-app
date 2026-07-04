import DemoCarousel from '@/components/DemoCarousel'
import styles from './page.module.css'

export default function Page() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.wordmark}>SHAi</h1>
        <p className={styles.tagline}>Small Happy Appetites, Incorporated!</p>
        <DemoCarousel />
      </div>
    </main>
  )
}
