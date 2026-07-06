import Image from 'next/image'
import DemoCarousel from '@/components/DemoCarousel'
import styles from './page.module.css'

export default function Page() {
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
        <DemoCarousel />
      </div>
    </main>
  )
}
