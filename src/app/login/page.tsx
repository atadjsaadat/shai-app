import LoginForm from '@/components/LoginForm'
import SHAiPresence from '@/components/SHAiPresence'
import SHAiBrand from '@/components/SHAiBrand'
import styles from '../signup/page.module.css'

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const redirect = params?.redirect

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <SHAiPresence expression="default" size={71} />
          <SHAiBrand expression="default" width={200} />
        </div>
        <p className={styles.tagline}>Small Happy Appetites, Incorporated!</p>
        <div className={styles.card}>
          <p className={styles.cardLabel}>Sign in</p>
          <LoginForm redirectTo={redirect} />
        </div>
        <p className={styles.signin}>
          New here?{' '}
          <a href={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'} className={styles.signinLink}>Create account</a>
        </p>
      </div>
    </main>
  )
}
