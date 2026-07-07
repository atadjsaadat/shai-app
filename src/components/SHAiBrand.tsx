'use client';
import SHAiPresence from './SHAiPresence';

type Expression = 'default' | 'thinking' | 'celebrating';

// Derived from SVG path data — i-dot centre as fraction of tight 744×423 viewBox
const DOT_X = 703.134 / 744;
const DOT_Y = 110.739 / 423;
const ASPECT = 423 / 744;

export default function SHAiBrand({ expression = 'default', width = 200 }: { expression?: Expression; width?: number }) {
  const height = Math.round(width * ASPECT);
  // Match the actual i-dot width in the SVG (45.67 units of 744 total = 6.14%)
  const orbSize = Math.max(8, Math.round(width * 0.0614));
  const dotX = Math.round(width * DOT_X);
  const dotY = Math.round(height * DOT_Y);

  return (
    <div style={{ position: 'relative', width, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/SHAi Word No Dot.svg" alt="SHAi" width={width} height={height} style={{ display: 'block' }} />
      <div style={{
        position: 'absolute',
        left: dotX,
        top: dotY,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}>
        <SHAiPresence expression={expression} size={orbSize} />
      </div>
    </div>
  );
}
