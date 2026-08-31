import { NextRequest, NextResponse } from 'next/server'
import { runBarcodeAudit } from '@/lib/barcode/audit'

// Vercel Cron: runs nightly at 20:00 UTC (22:00 Malta summer, 21:00 Malta winter)
// Schedule in vercel.json: "0 20 * * *"
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summary = await runBarcodeAudit()
  console.log('[barcode-audit]', JSON.stringify(summary))
  return NextResponse.json(summary)
}
