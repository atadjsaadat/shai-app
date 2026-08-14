'use client';
import SHAiBrand from './SHAiBrand';

export default function AIDisclosure() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '4px 16px 8px' }}>
      <SHAiBrand expression="default" width={28} />
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1 }}>
        {' '}is an AI assistant.
      </span>
    </div>
  );
}
