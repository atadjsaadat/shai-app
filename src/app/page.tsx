import DemoCarousel from '@/components/DemoCarousel'
import SHAiPresence from '@/components/SHAiPresence'
import SHAiBrand from '@/components/SHAiBrand'
import styles from './page.module.css'

export default function Page() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <SHAiPresence expression="default" size={71} />
          <SHAiBrand expression="default" width={200} />
        </div>
        <p className={styles.tagline}>Small Happy Appetites, Incorporated!</p>
        <DemoCarousel />
      </div>
    </main>
  )
}
