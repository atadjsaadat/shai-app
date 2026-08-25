import type { Metadata, Viewport } from 'next'
import { Nunito, Patrick_Hand } from 'next/font/google'
import './globals.css'

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
})

const patrickHand = Patrick_Hand({
  variable: '--font-handwriting',
  subsets: ['latin'],
  weight: '400',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: 'resizes-visual',
}

export const metadata: Metadata = {
  title: 'SHAi — Small Happy Appetites',
  description: 'The companion for every feed, meal, and milestone — from newborn to first day of school.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SHAi',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${patrickHand.variable}`}>
      <body>{children}</body>
    </html>
  )
}
