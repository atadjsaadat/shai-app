import DemoCarousel from '@/components/DemoCarousel'
import SHAiPresence from '@/components/SHAiPresence'
import SHAiBrand from '@/components/SHAiBrand'

export default function Page() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 390, width: '100%', padding: '2rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
          <SHAiPresence expression="default" size={71} />
          <SHAiBrand expression="default" width={200} />
        </div>
        <p style={{ fontSize: '0.9375rem', color: '#B09585', fontWeight: 500 }}>
          Small Happy Appetites, Incorporated!
        </p>
        <DemoCarousel />
        <a
          href="/signup"
          style={{
            display: 'block',
            width: '100%',
            padding: '0.9rem',
            background: '#C4714A',
            color: 'white',
            borderRadius: '0.875rem',
            fontSize: '1rem',
            fontWeight: 700,
            textAlign: 'center',
            textDecoration: 'none',
          }}
        >
          Let&apos;s Get Started
        </a>
      </div>
    </main>
  )
}
