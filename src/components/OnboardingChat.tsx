'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SHAiPresence from '@/components/SHAiPresence'
import {
  INITIAL_COLLECTED,
  type CollectedData,
  type ApiMessage,
  type OnboardingApiResponse,
} from '@/lib/ai/onboarding'

const OPENING_TEXT =
  "Hi! I'm SHAi. I'm going to help you set up your little one's profile — it only takes a couple of minutes. What's their name?"

const OPENING_API_CONTENT = JSON.stringify({
  message: OPENING_TEXT,
  collected: INITIAL_COLLECTED,
  complete: false,
})

// Markers for extracting the message text from the streamed JSON
const MSG_START = '{"message":"'
const MSG_END = '","collected"'
// Hold back this many chars at the tail so a chunk boundary inside MSG_END never
// shows spurious JSON characters in the streaming bubble.
const MSG_END_GUARD = MSG_END.length - 1

type ChatMessage = { role: 'user' | 'assistant'; text: string }

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 20 }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#B09585',
            animation: `shai-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes shai-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </div>
  )
}

function unescape(raw: string) {
  return raw.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

export default function OnboardingChat() {
  const router = useRouter()
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: OPENING_TEXT },
  ])
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([
    { role: 'assistant', content: OPENING_API_CONTENT },
  ])
  const [collected, setCollected] = useState<CollectedData>(INITIAL_COLLECTED)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [streamingText, setStreamingText] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Smooth scroll when a completed message lands or typing dots appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isTyping])

  // Instant scroll to follow streaming text as it grows
  useEffect(() => {
    if (streamingText !== null) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }
  }, [streamingText])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const vv = window.visualViewport
    if (!vv) return () => { document.body.style.overflow = '' }
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardOffset(offset)
      if (offset > 0) bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      document.body.style.overflow = ''
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  const submit = async () => {
    const text = input.trim()
    if (!text || isTyping) return

    const userApiMsg: ApiMessage = { role: 'user', content: text }
    const nextApiMessages = [...apiMessages, userApiMsg]

    setChatMessages(prev => [...prev, { role: 'user', text }])
    setApiMessages(nextApiMessages)
    setInput('')
    setIsTyping(true)

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextApiMessages }),
      })

      if (!res.body) throw new Error('No stream body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let rawBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        rawBuffer += decoder.decode(value, { stream: true })

        // Once we have the full MSG_START prefix, start extracting message text
        if (rawBuffer.startsWith(MSG_START)) {
          const inner = rawBuffer.slice(MSG_START.length)
          const endIdx = inner.indexOf(MSG_END)
          let rawText: string
          if (endIdx !== -1) {
            rawText = inner.slice(0, endIdx)
          } else {
            // Hold back enough chars that a split MSG_END never leaks into the bubble
            rawText = inner.length > MSG_END_GUARD ? inner.slice(0, inner.length - MSG_END_GUARD) : ''
          }
          setStreamingText(unescape(rawText))
        }
      }

      rawBuffer += decoder.decode() // flush remaining bytes

      const parsed: OnboardingApiResponse = JSON.parse(rawBuffer)

      // Batch all final state updates together
      setChatMessages(prev => [...prev, { role: 'assistant', text: parsed.message }])
      setApiMessages(prev => [...prev, { role: 'assistant', content: rawBuffer.trim() }])
      setCollected(parsed.collected)
      setStreamingText(null)
      setIsTyping(false)
      if (parsed.complete) setIsComplete(true)

    } catch {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', text: "Sorry, something went wrong — could you try that again?" },
      ])
      setStreamingText(null)
      setIsTyping(false)
    }
  }

  const childName = collected.childName

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', paddingBottom: keyboardOffset, boxSizing: 'border-box', background: '#FDFAF5', maxWidth: 390, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        padding: '0.875rem 1.25rem',
        borderBottom: '1px solid #EDE5D4',
        background: '#FDFAF5',
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        flexShrink: 0,
      }}>
        <SHAiPresence expression="default" size={34} />
        <div>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#3D2B1F', lineHeight: 1.2 }}>
            {childName ? `Setting up ${childName}` : 'Setting up your little one'}
          </p>
          <p style={{ fontSize: '0.6875rem', color: '#B09585', marginTop: 2 }}>SHAi is an AI assistant.</p>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div style={{ flex: 1 }} />
        {chatMessages.map((msg, i) =>
          msg.role === 'assistant' ? (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', maxWidth: '85%' }}>
              <div style={{ flexShrink: 0, marginBottom: 2 }}>
                <SHAiPresence expression="default" size={26} />
              </div>
              <div style={{
                background: '#F5F0E8',
                borderRadius: '1rem 1rem 1rem 0.25rem',
                padding: '0.75rem 1rem',
                fontSize: '0.9375rem',
                color: '#3D2B1F',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                background: '#C4714A',
                borderRadius: '1rem 1rem 0.25rem 1rem',
                padding: '0.75rem 1rem',
                maxWidth: '85%',
                fontSize: '0.9375rem',
                color: 'white',
                lineHeight: 1.55,
              }}>
                {msg.text}
              </div>
            </div>
          )
        )}

        {/* Typing dots — shown only while waiting for first streaming character */}
        {isTyping && streamingText === null && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ flexShrink: 0, marginBottom: 2 }}>
              <SHAiPresence expression="thinking" size={26} />
            </div>
            <div style={{
              background: '#F5F0E8',
              borderRadius: '1rem 1rem 1rem 0.25rem',
              padding: '0.75rem 1rem',
            }}>
              <TypingDots />
            </div>
          </div>
        )}

        {/* Live streaming bubble — replaces typing dots once text starts arriving */}
        {streamingText !== null && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', maxWidth: '85%' }}>
            <div style={{ flexShrink: 0, marginBottom: 2 }}>
              <SHAiPresence expression="thinking" size={26} />
            </div>
            <div style={{
              background: '#F5F0E8',
              borderRadius: '1rem 1rem 1rem 0.25rem',
              padding: '0.75rem 1rem',
              fontSize: '0.9375rem',
              color: '#3D2B1F',
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
            }}>
              {streamingText}
            </div>
          </div>
        )}

        {isComplete && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem' }}>
            <button
              onClick={() => router.push(`/onboarding/complete?name=${encodeURIComponent(collected.childName ?? '')}`)}
              style={{
                padding: '0.75rem 2rem',
                background: '#C4714A',
                color: 'white',
                border: 'none',
                borderRadius: '0.875rem',
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Continue
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid #EDE5D4',
        background: '#FDFAF5',
        display: 'flex',
        gap: '0.5rem',
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 320)}
          placeholder="Type your reply…"
          disabled={isTyping}
          autoComplete="off"
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            border: '1.5px solid #EDE5D4',
            borderRadius: '0.75rem',
            background: '#FDFAF5',
            fontFamily: 'inherit',
            fontSize: '1rem',
            color: '#3D2B1F',
            outline: 'none',
            opacity: isTyping ? 0.5 : 1,
          }}
        />
        <button
          onClick={submit}
          disabled={!input.trim() || isTyping}
          style={{
            padding: '0.75rem 1.1rem',
            background: '#C4714A',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            fontFamily: 'inherit',
            fontSize: '0.9375rem',
            fontWeight: 700,
            cursor: 'pointer',
            opacity: !input.trim() || isTyping ? 0.4 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
