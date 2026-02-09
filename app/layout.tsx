import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Racing Predictor - Cheltenham 2026',
  description: 'AI-Powered Cheltenham Festival predictions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
