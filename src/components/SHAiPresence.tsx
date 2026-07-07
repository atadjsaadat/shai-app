'use client';

import { useId } from 'react';

type Expression = 'default' | 'thinking' | 'celebrating';

interface SHAiPresenceProps {
  expression?: Expression;
  size?: number;
}

export default function SHAiPresence({ expression = 'default', size = 80 }: SHAiPresenceProps) {
  const uid = useId().replace(/:/g, '');
  const gradId = `grad-${uid}`;
  const glowId = `glow-${uid}`;
  const glowOuterId = `glow-outer-${uid}`;
  const clipId = `orb-clip-${uid}`;
  const r = size / 2;

  const ring1R = r * 1.24;
  const ring2R = r * 1.1;
  const ring3R = r * 1.38;
  const ring1Stroke = size * 0.03;
  const ring2Stroke = size * 0.018;
  const ring3Stroke = size * 0.013;
  const ring1C = 2 * Math.PI * ring1R;
  const ring2C = 2 * Math.PI * ring2R;
  const ring3C = 2 * Math.PI * ring3R;
  const ring1Dash = `${ring1C / 8} ${ring1C / 8}`;
  const ring2Dash = `${ring2C / 14} ${ring2C / 14}`;
  const ring3Dash = `${ring3C / 6} ${ring3C / 6}`;

  const ringColor = expression === 'thinking' ? '#C4714A' : '#7A9E7E';
  const isCelebrating = expression === 'celebrating';
  const isThinking = expression === 'thinking';
  const auraColor = isThinking ? '#7A9E7E' : '#C4714A';

  const ring1Speed = isCelebrating ? '4s' : isThinking ? '16s' : '12s';
  const ring2Speed = isCelebrating ? '2.5s' : isThinking ? '10s' : '7s';
  const ring3Speed = isCelebrating ? '5.5s' : isThinking ? '20s' : '9s';

  const thinkingRipples = [
    { delay: 0,   stroke: 1.5 },
    { delay: 0.6, stroke: 1.5 },
    { delay: 1.2, stroke: 1.5 },
    { delay: 1.8, stroke: 1.5 },
  ];


  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ background: 'transparent', overflow: 'visible' }}
    >
      <style>{`
        @keyframes pulse-default-${uid} {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }
        @keyframes pulse-thinking-${uid} {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }
        @keyframes celebrate-${uid} {
          0%,100% { transform: scale(1); }
          25%      { transform: scale(1.2); }
          65%      { transform: scale(1.05); }
        }
        @keyframes sonar-${uid} {
          0%   { transform: scale(1); opacity: 0.75; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes aura-breathe-${uid} {
          0%,100% { opacity: 0.38; }
          50%      { opacity: 0.6; }
        }
        @keyframes aura-outer-breathe-${uid} {
          0%,100% { opacity: 0.18; }
          50%      { opacity: 0.32; }
        }
        @keyframes ripple-${uid} {
          0%   { transform: scale(0.2);  opacity: 0.5; }
          100% { transform: scale(1.1);  opacity: 0; }
        }
        @keyframes ring-cw-${uid} {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ring-ccw-${uid} {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
      `}</style>

      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="55%">
          {isThinking ? (
            <>
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="30%"  stopColor="#FDFAF5" />
              <stop offset="65%"  stopColor="#7A9E7E" />
              <stop offset="100%" stopColor="#4A7050" />
            </>
          ) : (
            <>
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="30%"  stopColor="#FDFAF5" />
              <stop offset="65%"  stopColor="#C4714A" />
              <stop offset="100%" stopColor="#9E5035" />
            </>
          )}
        </radialGradient>
        <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={size * 0.13} />
        </filter>
        <filter id={glowOuterId} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation={size * 0.28} />
        </filter>
        <clipPath id={clipId}>
          <circle cx={r} cy={r} r={r * 0.92} />
        </clipPath>
      </defs>

      {/* Wide outer halo */}
      <circle
        cx={r}
        cy={r}
        r={r * 0.9}
        fill={auraColor}
        filter={`url(#${glowOuterId})`}
        style={{ animation: `aura-outer-breathe-${uid} 5s ease-in-out infinite 1.5s` }}
      />

      {/* Inner aura */}
      <circle
        cx={r}
        cy={r}
        r={r * 0.82}
        fill={auraColor}
        filter={`url(#${glowId})`}
        style={{ animation: `aura-breathe-${uid} 4s ease-in-out infinite` }}
      />

      {/* Sonar rings — celebrating only, play twice then settle */}
      {isCelebrating && [0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={r}
          cy={r}
          r={r}
          fill="none"
          stroke="#C4714A"
          strokeWidth={Math.max(0.5, size * 0.011)}
          style={{
            transformOrigin: `${r}px ${r}px`,
            opacity: 0,
            animation: `sonar-${uid} 1.2s ease-out ${i * 0.3}s infinite`,
          }}
        />
      ))}

      {/* Outermost ring */}
      <circle
        cx={r} cy={r} r={ring3R}
        fill="none" stroke={ringColor}
        strokeWidth={ring3Stroke} strokeDasharray={ring3Dash}
        strokeLinecap="round" opacity="0.4"
        style={{
          transformOrigin: `${r}px ${r}px`,
          animation: `ring-${isThinking ? 'ccw' : 'cw'}-${uid} ${ring3Speed} linear infinite`,
        }}
      />

      {/* Middle ring */}
      <circle
        cx={r} cy={r} r={ring1R}
        fill="none" stroke={ringColor}
        strokeWidth={ring1Stroke} strokeDasharray={ring1Dash}
        strokeLinecap="round" opacity="0.85"
        style={{
          transformOrigin: `${r}px ${r}px`,
          animation: `ring-${isThinking ? 'cw' : 'ccw'}-${uid} ${ring1Speed} linear infinite`,
        }}
      />

      {/* Inner ring */}
      <circle
        cx={r} cy={r} r={ring2R}
        fill="none" stroke={ringColor}
        strokeWidth={ring2Stroke} strokeDasharray={ring2Dash}
        strokeLinecap="round" opacity="0.5"
        style={{
          transformOrigin: `${r}px ${r}px`,
          animation: `ring-${isThinking ? 'ccw' : 'cw'}-${uid} ${ring2Speed} linear infinite`,
        }}
      />

      {/* Main orb */}
      <g
        style={{
          transformOrigin: `${r}px ${r}px`,
          animation:
            isCelebrating
              ? `celebrate-${uid} 1.6s ease-in-out infinite`
              : isThinking
                ? `pulse-thinking-${uid} 3.8s ease-in-out infinite`
                : `pulse-default-${uid} 3s ease-in-out infinite`,
        }}
      >
        <circle cx={r} cy={r} r={r} fill={`url(#${gradId})`} />

        {/* Specular highlight */}
        <ellipse
          cx={r}
          cy={r}
          rx={r * 0.28}
          ry={r * 0.22}
          fill="white"
          opacity="0.28"
        />
      </g>

      {/* Thinking ripples */}
      {isThinking && (
        <g clipPath={`url(#${clipId})`}>
          {thinkingRipples.map((rpl, i) => (
            <circle
              key={i}
              cx={r} cy={r} r={r}
              fill="none" stroke="#FDFAF5"
              strokeWidth={rpl.stroke}
              style={{
                transformOrigin: `${r}px ${r}px`,
                animation: `ripple-${uid} 2.4s ease-out ${rpl.delay}s infinite`,
              }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
