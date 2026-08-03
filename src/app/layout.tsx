import type { Metadata, Viewport } from 'next'
import { Nunito, Caveat } from 'next/font/google'
import './globals.css'

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
})

const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: 'resizes-visual',
}

export const metadata: Metadata = {
  title: 'SHAI — Small Happy Appetites, Incorporated!',
  description: 'The companion for every feed, meal, and milestone — from newborn to first day of school.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${caveat.variable}`}>
      <body>{children}</body>
    </html>
  )
}
