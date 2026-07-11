import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};

export default function LogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
