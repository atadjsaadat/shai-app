'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SHAiPresence from '@/components/SHAiPresence';
import styles from './page.module.css';
import { saveFoodLog } from '@/lib/log/save';
import type { LogMessage, ParseApiResponse, MealType, ParsedFoodItem } from '@/lib/log/types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'hydration'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  hydration: 'Hydration',
};

const MACROS: { key: keyof ParsedFoodItem; label: string; unit: string; color: string }[] = [
  { key: 'calories_kcal', label: 'cal',   unit: '',   color: '#C4714A' },
  { key: 'protein_g',     label: 'pro',   unit: 'g',  color: '#D4A72C' },
  { key: 'carbs_g',       label: 'carbs', unit: 'g',  color: '#B09585' },
  { key: 'fat_g',         label: 'fat',   unit: 'g',  color: '#A67BC4' },
  { key: 'fibre_g',       label: 'fibre', unit: 'g',  color: '#7A9E7E' },
  { key: 'sugar_g',       label: 'sugar', unit: 'g',  color: '#E8874A' },
  { key: 'sodium_mg',     label: 'salt',  unit: 'mg', color: '#7AA5C4' },
  { key: 'iron_mg',       label: 'iron',  unit: 'mg', color: '#B87333' },
];

function detectMealType(): MealType {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 12 && h < 15) return 'lunch';
  if (h >= 18 && h < 21) return 'dinner';
  return 'snack';
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

type Phase = 'chatting' | 'confirming' | 'saving' | 'saved';

const HARD_DAY_ACK =
  "That's okay — some days are just like that. You showed up, and that's what matters.";

function FoodItemCard({ item }: { item: ParsedFoodItem }) {
  return (
    <div className={styles.foodItem}>
      <div className={styles.foodItemTop}>
        <span className={styles.foodName}>{item.food_name}</span>
        {item.serving_size_description && (
          <span className={styles.serving}>{item.serving_size_description}</span>
        )}
      </div>
      <div className={styles.macroRow}>
        {MACROS.map(({ key, label, unit, color }) => {
          const raw = item[key] as number | null | undefined;
          if (raw == null) return null;
          return (
            <span
              key={key}
              className={styles.macroChip}
              style={{ '--c': color } as React.CSSProperties}
            >
              {Math.round(raw)}{unit} {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function LogPage() {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>(detectMealType);
  const [messages, setMessages] = useState<LogMessage[]>([
    { id: '0', role: 'assistant', content: "What did your little one have? The more detail the better — ingredients, type, and roughly how much." },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [phase, setPhase] = useState<Phase>('chatting');
  const [parsedData, setParsedData] = useState<ParseApiResponse | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [childValidated, setChildValidated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Always resolve child from DB; localStorage is just a cache for same-device speed
  useEffect(() => {
    const storedId = localStorage.getItem('shai_active_child_id');
    fetch('/api/children')
      .then((r) => r.json())
      .then((json) => {
        if (json.childId) {
          localStorage.setItem('shai_active_child_id', json.childId);
          if (json.childName) localStorage.setItem('shai_child_name', json.childName);
          const name = json.childName ?? localStorage.getItem('shai_child_name');
          if (name) setMessages([{ id: '0', role: 'assistant', content: `What did ${name} have? The more detail the better — ingredients, type, and roughly how much.` }]);
          setChildValidated(true);
        } else {
          localStorage.removeItem('shai_active_child_id');
          localStorage.removeItem('shai_child_name');
          router.replace('/onboarding');
        }
      })
      .catch(() => {
        const name = localStorage.getItem('shai_child_name');
        if (name) setMessages([{ id: '0', role: 'assistant', content: `What did ${name} have? The more detail the better — ingredients, type, and roughly how much.` }]);
        if (storedId) setChildValidated(true);
        else router.replace('/onboarding');
      });
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
  }, [input]);

  const handleHardFoodDay = () => {
    const userMsg: LogMessage = { id: generateId(), role: 'user', content: 'Hard food day.' };
    const asstMsg: LogMessage = { id: generateId(), role: 'assistant', content: HARD_DAY_ACK };
    setMessages((prev) => [...prev, userMsg, asstMsg]);
    setParsedData({
      message: HARD_DAY_ACK,
      foodItems: [],
      clarifyingQuestion: null,
      mealType,
      isHardFoodDay: true,
      complete: true,
    });
    setPhase('confirming');
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking || phase !== 'chatting') return;

    const userMsg: LogMessage = { id: generateId(), role: 'user', content: text };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput('');
    setIsThinking(true);
    textareaRef.current?.focus(); // sync — keeps iOS keyboard open

    try {
      const res = await fetch('/api/log/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          mealType,
        }),
      });

      const data: ParseApiResponse = await res.json();

      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: 'assistant', content: data.message },
      ]);

      if (data.complete) {
        setParsedData(data);
        setPhase('confirming');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: "Sorry, something went wrong — could you try again?",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }, [input, isThinking, messages, mealType, phase]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleConfirm = async () => {
    if (!parsedData) return;
    setPhase('saving');
    setSaveError(null);

    let childId = localStorage.getItem('shai_active_child_id') ?? '';
    if (!childId) {
      const res = await fetch('/api/children');
      if (res.ok) {
        const json = await res.json();
        if (json.childId) {
          childId = json.childId;
          localStorage.setItem('shai_active_child_id', json.childId);
          if (json.childName) localStorage.setItem('shai_child_name', json.childName);
        }
      }
    }

    const { error } = await saveFoodLog(
      childId,
      parsedData.foodItems,
      parsedData.mealType,
      parsedData.isHardFoodDay
    );

    if (error) {
      setSaveError(error);
      setPhase('confirming');
      return;
    }

    // Invalidate home page caches so next visit regenerates with fresh data
    const today = new Date().toISOString().slice(0, 10);
    const monday = (() => {
      const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10);
    })();
    localStorage.removeItem(`shai_daily_feedback_${today}`);
    localStorage.removeItem(`shai_weekly_summary_${monday}`);

    setPhase('saved');
  };

  const handleEdit = () => {
    setParsedData(null);
    setPhase('chatting');
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: 'assistant', content: "No problem — what would you like to change?" },
    ]);
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  const handleLogAnother = () => {
    const name = localStorage.getItem('shai_child_name');
    setMessages([
      { id: generateId(), role: 'assistant', content: name ? `What else did ${name} have?` : "What else did they have?" },
    ]);
    setParsedData(null);
    setSaveError(null);
    setPhase('chatting');
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  const isConfirmingOrSaving = phase === 'confirming' || phase === 'saving';

  if (!childValidated) return null;

  return (
    <div className={styles.screen}>
      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push('/home')} aria-label="Back to home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        {phase === 'chatting' && (
          <button className={styles.hardDayBtn} onClick={handleHardFoodDay}>
            Hard day
          </button>
        )}
      </div>

      {/* ── Meal type tabs ── */}
      <div className={styles.tabsRow}>
        {MEAL_TYPES.map((type) => (
          <button
            key={type}
            className={`${styles.tab} ${mealType === type ? styles.tabActive : ''}`}
            onClick={() => phase === 'chatting' && setMealType(type)}
            disabled={phase !== 'chatting'}
          >
            {MEAL_LABELS[type]}
          </button>
        ))}
      </div>

      <p className={styles.aiDisclosure}>SHAI is an AI assistant.</p>

      {/* ── Messages ── */}
      <div className={`${styles.messages} ${phase === 'chatting' ? styles.messagesChat : ''}`}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.row} ${msg.role === 'user' ? styles.rowUser : styles.rowAssistant}`}
          >
            {msg.role === 'assistant' && (
              <SHAiPresence expression="default" size={28} />
            )}
            <div className={`${styles.bubble} ${msg.role === 'assistant' ? styles.bubbleAssistant : styles.bubbleUser}`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className={`${styles.row} ${styles.rowAssistant}`}>
            <SHAiPresence expression="thinking" size={28} />
            <div className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.typing}`}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Chat input ── */}
      {phase === 'chatting' && (
        <div className={styles.inputWrap}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder="Describe the meal…"
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
      )}

      {/* ── Confirm panel ── */}
      {isConfirmingOrSaving && parsedData && (
        <div className={styles.confirmPanel}>
          {parsedData.isHardFoodDay ? (
            <div className={styles.hardDayCard}>
              <SHAiPresence expression="default" size={32} />
              <p className={styles.hardDayCardText}>
                We&apos;ve noted it. That&apos;s all you need to do today.
              </p>
            </div>
          ) : (
            <div className={styles.foodList}>
              {parsedData.foodItems.map((item, i) => (
                <FoodItemCard key={i} item={item} />
              ))}
            </div>
          )}

          {saveError && <p className={styles.saveError}>{saveError}</p>}

          <div className={styles.confirmRow}>
            <button
              className={styles.confirmBtn}
              onClick={handleConfirm}
              disabled={phase === 'saving'}
            >
              {phase === 'saving'
                ? 'Saving…'
                : parsedData.isHardFoodDay
                ? 'Log it'
                : 'Looks right ✓'}
            </button>
            {!parsedData.isHardFoodDay && (
              <button
                className={styles.editBtn}
                onClick={handleEdit}
                disabled={phase === 'saving'}
              >
                Edit
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Saved panel ── */}
      {phase === 'saved' && (
        <div className={styles.savedPanel}>
          <div className={styles.savedInner}>
            <SHAiPresence expression="celebrating" size={40} />
            <p className={styles.savedText}>
              {parsedData?.isHardFoodDay ? "Noted. You're doing great." : 'All logged!'}
            </p>
          </div>
          <div className={styles.savedBtns}>
            <button className={styles.logAnotherBtn} onClick={handleLogAnother}>
              Log another
            </button>
            <button className={styles.doneBtn} onClick={() => router.push('/home')}>
              All done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
