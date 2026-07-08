import SHAiPresence from '@/components/SHAiPresence';

export default function TestPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48, padding: 64, background: '#FDFAF5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', gap: 64, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <SHAiPresence expression="default" size={80} />
          <span style={{ fontFamily: 'sans-serif', color: '#7A6255', fontSize: 14 }}>default</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <SHAiPresence expression="thinking" size={80} />
          <span style={{ fontFamily: 'sans-serif', color: '#7A6255', fontSize: 14 }}>thinking</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <SHAiPresence expression="celebrating" size={80} />
          <span style={{ fontFamily: 'sans-serif', color: '#7A6255', fontSize: 14 }}>celebrating</span>
        </div>
      </div>
    </div>
  );
}
