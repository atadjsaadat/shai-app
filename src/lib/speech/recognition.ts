export type SpeechHandler = {
  supported: boolean
  start: (
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onEnd: () => void,
    onError: () => void
  ) => void
  stop: () => void
}

// Wraps the browser Web Speech API. Call once per component via useRef + useEffect.
export function createSpeechRecognition(): SpeechHandler {
  if (typeof window === 'undefined') {
    return { supported: false, start: (_, __, ___, onError) => onError(), stop: () => {} }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  const SpeechRecognitionClass = w.SpeechRecognition ?? w.webkitSpeechRecognition

  if (!SpeechRecognitionClass) {
    return { supported: false, start: (_, __, ___, onError) => onError(), stop: () => {} }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec: any = new SpeechRecognitionClass()
  rec.continuous = true
  rec.interimResults = true
  rec.lang = 'en-GB'

  return {
    supported: true,
    start(onInterim, onFinal, onEnd, onError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (event: any) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) onFinal(transcript)
          else interim += transcript
        }
        if (interim) onInterim(interim)
      }
      rec.onend = onEnd
      rec.onerror = () => onError()
      try { rec.start() } catch { onError() }
    },
    stop() {
      try { rec.stop() } catch { /* ignore */ }
    },
  }
}
