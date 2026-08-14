'use client';
import SHAiPresence from './SHAiPresence';

type Expression = 'default' | 'thinking' | 'celebrating';

// Derived from SVG path data — i-dot centre as fraction of tight 744×423 viewBox
const DOT_X = 703.134 / 744;
const DOT_Y = 110.739 / 423;
const ASPECT = 423 / 744;

export default function SHAiBrand({ expression = 'default', width = 200 }: { expression?: Expression; width?: number }) {
  const height = Math.round(width * ASPECT);
  // i-dot exact dimensions from SVG path data: right(62.015625) − left(16.34375) = 45.671875 of 744
  const orbSize = width * (45.671875 / 744);
  const dotX = width * DOT_X;
  const dotY = height * DOT_Y;

  return (
    <div style={{ position: 'relative', width, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/SHAi Word No Dot.svg" alt="SHAi" width={width} height={height} style={{ display: 'block' }} />
      <div style={{
        position: 'absolute',
        left: dotX,
        top: dotY,
        width: orbSize,
        height: orbSize,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        overflow: 'visible',
      }}>
        <SHAiPresence expression={expression} size={orbSize} />
      </div>
    </div>
  );
}
