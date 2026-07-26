'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import BottomNav from '@/components/BottomNav';
import { createSpeechRecognition } from '@/lib/speech/recognition';
import styles from './page.module.css';

interface JournalEntry {
  id: string;
  content: string;
  dictated: boolean;
  include_in_ai_context: boolean;
  created_at: string;
}

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function MicButton({ listening, onClick, disabled }: { listening: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      className={`${styles.micBtn}${listening ? ` ${styles.micBtnActive}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={listening ? 'Stop dictation' : 'Start dictation'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="11" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="9" y1="23" x2="15" y2="23" />
      </svg>
    </button>
  );
}

export default function JourneyPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [composerInterim, setComposerInterim] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editInterim, setEditInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [listenTarget, setListenTarget] = useState<'composer' | 'edit'>('composer');
  const [saving, setSaving] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);

  const speechRef = useRef<ReturnType<typeof createSpeechRecognition> | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    speechRef.current = createSpeechRecognition();
    return () => { speechRef.current?.stop(); };
  }, []);

  useEffect(() => {
    const cid = localStorage.getItem('shai_active_child_id');
    setChildId(cid);

    fetch('/api/journey')
      .then(r => r.json())
      .then(data => { if (data.entries) setEntries(data.entries); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const stopListening = useCallback(() => {
    speechRef.current?.stop();
    setListening(false);
    setComposerInterim('');
    setEditInterim('');
  }, []);

  function toggleDictation(target: 'composer' | 'edit') {
    if (listening) { stopListening(); return; }

    const speech = speechRef.current;
    if (!speech?.supported) return;

    setListenTarget(target);
    setListening(true);

    speech.start(
      (interim) => {
        if (target === 'composer') setComposerInterim(interim);
        else setEditInterim(interim);
      },
      (final) => {
        if (target === 'composer') {
          setComposerText(prev => prev + (prev.trimEnd() ? ' ' : '') + final);
          setComposerInterim('');
          setTimeout(() => autoResize(composerRef.current), 0);
        } else {
          setEditText(prev => prev + (prev.trimEnd() ? ' ' : '') + final);
          setEditInterim('');
          setTimeout(() => autoResize(editRef.current), 0);
        }
      },
      () => { setListening(false); setComposerInterim(''); setEditInterim(''); },
      () => { setListening(false); setComposerInterim(''); setEditInterim(''); },
    );
  }

  async function saveNewEntry() {
    const text = composerText.trim();
    if (!text || saving) return;
    setSaving(true);
    stopListening();
    try {
      const res = await fetch('/api/journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, child_id: childId, dictated: false }),
      });
      const data = await res.json();
      if (data.entry) {
        setEntries(prev => [data.entry, ...prev]);
        setComposerText('');
        setComposing(false);
      }
    } catch { /* silently fail */ }
    setSaving(false);
  }

  function startEdit(entry: JournalEntry) {
    stopListening();
    setEditingId(entry.id);
    setEditText(entry.content);
    setTimeout(() => autoResize(editRef.current), 0);
  }

  async function saveEdit() {
    if (!editingId || saving) return;
    const text = editText.trim();
    if (!text) return;
    setSaving(true);
    stopListening();
    try {
      const res = await fetch(`/api/journey/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (data.entry) {
        setEntries(prev => prev.map(e => e.id === editingId ? data.entry : e));
        setEditingId(null);
      }
    } catch { /* silently fail */ }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
    try {
      await fetch(`/api/journey/${id}`, { method: 'DELETE' });
    } catch {
      // Re-fetch on failure
      fetch('/api/journey').then(r => r.json()).then(d => { if (d.entries) setEntries(d.entries); }).catch(() => {});
    }
  }

  function cancelEdit() {
    stopListening();
    setEditingId(null);
  }

  function openComposer() {
    setComposing(true);
    setComposerText('');
    setTimeout(() => composerRef.current?.focus(), 80);
  }

  function cancelCompose() {
    stopListening();
    setComposing(false);
    setComposerText('');
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <p className={styles.title}>Journey</p>
        {!composing && (
          <button className={styles.newBtn} onClick={openComposer}>+ New</button>
        )}
      </header>

      {composing && (
        <div className={styles.composer}>
          <textarea
            ref={composerRef}
            className={styles.composerTextarea}
            placeholder="What's on your mind…"
            value={composerText}
            rows={4}
            onChange={e => { setComposerText(e.target.value); autoResize(e.target); }}
          />
          {(listening && listenTarget === 'composer') && (
            <p className={styles.interimHint}>
              {composerInterim || 'Listening…'}
            </p>
          )}
          <div className={styles.composerActions}>
            <MicButton
              listening={listening && listenTarget === 'composer'}
              onClick={() => toggleDictation('composer')}
            />
            <div className={styles.composerBtns}>
              <button className={styles.cancelBtn} onClick={cancelCompose}>Cancel</button>
              <button
                className={styles.saveBtn}
                onClick={saveNewEntry}
                disabled={!composerText.trim() || saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className={styles.hint}>Loading…</p>
      ) : entries.length === 0 && !composing ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Your journey starts here</p>
          <p className={styles.emptyText}>
            Tap &quot;+ New&quot; to write your first entry. You can type or dictate — SHAi will use your entries to personalise its responses.
          </p>
        </div>
      ) : (
        <div className={styles.entryList}>
          {entries.map(entry => (
            <div key={entry.id} className={styles.entryCard}>
              {editingId === entry.id ? (
                <>
                  <p className={styles.dateChip}>{formatEntryDate(entry.created_at)}</p>
                  <textarea
                    ref={editRef}
                    className={styles.editTextarea}
                    value={editText}
                    rows={4}
                    onChange={e => { setEditText(e.target.value); autoResize(e.target); }}
                  />
                  {(listening && listenTarget === 'edit') && (
                    <p className={styles.interimHint}>{editInterim || 'Listening…'}</p>
                  )}
                  <div className={styles.editActions}>
                    <MicButton
                      listening={listening && listenTarget === 'edit'}
                      onClick={() => toggleDictation('edit')}
                    />
                    <div className={styles.composerBtns}>
                      <button className={styles.cancelBtn} onClick={cancelEdit}>Cancel</button>
                      <button
                        className={styles.saveBtn}
                        onClick={saveEdit}
                        disabled={!editText.trim() || saving}
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.entryHeader}>
                    <span className={styles.dateChip}>{formatEntryDate(entry.created_at)}</span>
                    <div className={styles.entryBtns}>
                      <button className={styles.iconBtn} onClick={() => startEdit(entry)} aria-label="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button className={styles.iconBtn} onClick={() => deleteEntry(entry.id)} aria-label="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className={styles.entryContent}>{entry.content}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
