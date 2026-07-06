import Image from 'next/image'
import WaitlistForm from '@/components/WaitlistForm'
import styles from './page.module.css'

export default function WaitlistPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <Image
          src="/SHAi Logo Design Brief-2.png"
          alt="SHAi"
          width={180}
          height={180}
          priority
          className={styles.logo}
        />
        <p className={styles.tagline}>Small Happy Appetites, Incorporated!</p>
        <div className={styles.card}>
          <p className={styles.cardLabel}>Be among the first parents to try SHAi.</p>
          <WaitlistForm />
        </div>
      </div>
    </main>
  )
}
