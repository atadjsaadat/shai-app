// Single abstraction for camera-based barcode scanning.
// ZXing is dynamically imported so it never executes during SSR.
// Swap this file for a React Native implementation when going native.
//
// The stream is cached for the session so iOS does not re-prompt on "Scan another".
// Call stopCachedStream() when leaving the scan screen to release the camera.

let cachedStream: MediaStream | null = null

async function getStream(): Promise<MediaStream> {
  if (cachedStream?.active) return cachedStream
  cachedStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  return cachedStream
}

export function stopCachedStream(): void {
  if (cachedStream) {
    cachedStream.getTracks().forEach(t => t.stop())
    cachedStream = null
  }
}

export async function startBarcodeScanner(
  video: HTMLVideoElement,
  onResult: (barcode: string) => void,
  onError: (err: Error) => void,
): Promise<() => void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('HTTPS_REQUIRED')
  }

  const { BrowserMultiFormatReader, NotFoundException } = await import('@zxing/library')
  const reader = new BrowserMultiFormatReader()

  const stream = await getStream()

  // Require 2 consecutive matching reads before accepting — filters one-frame misreads
  let lastRead = ''
  await reader.decodeFromStream(stream, video, (result, err) => {
    if (result) {
      const text = result.getText()
      if (text === lastRead) {
        onResult(text)
      } else {
        lastRead = text
      }
    }
    if (err && !(err instanceof NotFoundException)) onError(err as Error)
  })

  // Stop the decode loop but keep the stream alive so "Scan another" never re-prompts
  return () => reader.reset()
}
