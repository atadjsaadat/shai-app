'use client';
import SHAiPresence from './SHAiPresence';

type Expression = 'default' | 'thinking' | 'celebrating';

// i-dot proportions from SVG path data (viewBox 744×423)
const DOT_X = 703.134 / 744;
const DOT_Y = 110.739 / 423;
const ASPECT = 423 / 744;
// orbSize = width * (45.671875/744). At width < 98px, orbSize < 6px — too small for SHAiPresence rings to render.
// Below that threshold, use the full static SVG (which has the correctly-proportioned dot already in it).
const ANIMATED_MIN_WIDTH = 98;

export default function SHAiBrand({ expression = 'default', width = 200 }: { expression?: Expression; width?: number }) {
  const height = Math.round(width * ASPECT);

  if (width < ANIMATED_MIN_WIDTH) {
    // Static: full SVG asset already has the i-dot at correct proportions
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/SHAi Word SVG.svg" alt="SHAi" width={width} height={height} style={{ display: 'block' }} />
    );
  }

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
