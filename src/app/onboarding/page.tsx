'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SHAiPresence from '@/components/SHAiPresence';
import styles from './page.module.css';
import type { Message, OnboardingData, ChatApiResponse } from '@/lib/onboarding/types';
import { createChildProfile, updateResearchConsent } from '@/lib/children/create';

const OPENING_MESSAGE =
  "Hi! I'm SHAI — so lovely to meet you. I'm here to help you get everything set up for your little one. First things first — what's your baby's name?";

function generateId() {
  return Math.random().toString(36).slice(2);
}

export default function OnboardingPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([
    { id: generateId(), role: 'assistant', content: OPENING_MESSAGE },
  ]);
  const [collected, setCollected] = useState<OnboardingData>({});
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [complete, setComplete] = useState(false);
  const [consentResearch, setConsentResearch] = useState(false);
  const [proceedVisible, setProceedVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
  }, [input]);

  useEffect(() => {
    if (!complete) return;
    const t = setTimeout(() => setProceedVisible(true), 1800);
    return () => clearTimeout(t);
  }, [complete]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking) return;

    const userMsg: Message = { id: generateId(), role: 'user', content: text };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput('');
    setIsThinking(true);
    // Synchronous focus — must happen within the user gesture, before any await,
    // so iOS keeps the keyboard open.
    textareaRef.current?.focus();

    try {
      const res = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          collected,
        }),
      });

      const data: ChatApiResponse = await res.json();
      const updatedCollected = { ...collected, ...data.collected };
      setCollected(updatedCollected);

      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: 'assistant', content: data.message },
      ]);

      if (data.complete) {
        setTimeout(() => setComplete(true), 1200);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: "Sorry, something went wrong on my end. Could you try that again?",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }, [input, isThinking, messages, collected]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (complete) {
    const childName = collected.childName ?? 'your little one';
    const parentName = collected.parentName;

    return (
      <div className={styles.completion}>
        <SHAiPresence expression="celebrating" size={80} />
        <p className={styles.completionHeading}>Congratulations on {childName}!</p>
        <p className={styles.completionSub}>You&apos;re all set, {parentName ?? 'you'}</p>

        <label className={styles.consentRow}>
          <span className={styles.consentText}>
            Help improve SHAi by sharing anonymised data with our research team. You can change this any time.
          </span>
          <span className={styles.toggle}>
            <input
              type="checkbox"
              checked={consentResearch}
              onChange={(e) => setConsentResearch(e.target.checked)}
            />
            <span className={styles.toggleTrack} />
            <span className={styles.toggleThumb} />
          </span>
        </label>

        {saveError && (
          <p style={{ color: '#C4714A', fontSize: '0.875rem', textAlign: 'center', marginTop: '0.5rem' }}>
            {saveError}
          </p>
        )}

        <button
          className={`${styles.proceedBtn} ${proceedVisible ? styles.visible : ''}`}
          disabled={!proceedVisible || saving}
          onClick={async () => {
            setSaving(true);
            setSaveError(null);
            const { childId, error } = await createChildProfile(collected);
            if (error || !childId) {
              setSaveError("Something went wrong saving your profile — please try again.");
              setSaving(false);
              return;
            }
            localStorage.setItem('shai_active_child_id', childId);
            if (collected.childName) localStorage.setItem('shai_child_name', collected.childName);
            await updateResearchConsent(consentResearch);
            router.push('/onboarding/partner-invite');
          }}
        >
          {saving ? 'Saving…' : "Let's go"}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <SHAiPresence expression={isThinking ? 'thinking' : 'default'} size={52} />
        <span className={styles.aiDisclosure}>SHAI is an AI assistant.</span>
      </div>

      <div className={styles.messages}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.row} ${msg.role === 'user' ? styles.rowUser : styles.rowAssistant}`}
          >
            {msg.role === 'assistant' && <span className={styles.dot} />}
            <div className={`${styles.bubble} ${msg.role === 'assistant' ? styles.bubbleAssistant : styles.bubbleUser}`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className={`${styles.row} ${styles.rowAssistant}`}>
            <span className={styles.dot} />
            <div className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.typing}`}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputWrap}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder="Type a message…"
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={!input.trim() || isThinking}
          aria-label="Send"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
