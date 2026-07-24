// Single abstraction for photo upload — swap this file only when moving to React Native

const MAX_BYTES = 800_000
const MAX_DIMENSION = 1200

export async function compressPhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)

      let quality = 0.85
      const attempt = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Compression failed')); return }
            if (blob.size <= MAX_BYTES || quality <= 0.4) { resolve(blob); return }
            quality -= 0.1
            attempt()
          },
          'image/jpeg',
          quality,
        )
      }
      attempt()
    }
    img.onerror = reject
    img.src = url
  })
}
