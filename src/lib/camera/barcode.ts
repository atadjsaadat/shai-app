// Single abstraction for camera-based barcode scanning.
// ZXing is dynamically imported so it never executes during SSR.
// Swap this file for a React Native implementation when going native.

export async function startBarcodeScanner(
  video: HTMLVideoElement,
  onResult: (barcode: string) => void,
  onError: (err: Error) => void,
): Promise<() => void> {
  const { BrowserMultiFormatReader, NotFoundException } = await import('@zxing/library')
  const reader = new BrowserMultiFormatReader()

  await reader.decodeFromConstraints(
    { video: { facingMode: 'environment' } },
    video,
    (result, err) => {
      if (result) onResult(result.getText())
      if (err && !(err instanceof NotFoundException)) onError(err as Error)
    },
  )

  return () => reader.reset()
}
