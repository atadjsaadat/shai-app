'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createSpeechRecognition } from '@/lib/speech/recognition';
import { useRouter } from 'next/navigation';
import SHAiPresence from '@/components/SHAiPresence';
import Confetti from '@/components/Confetti';
import BarcodeScanner from '@/components/BarcodeScanner';
import FeedsTab from '@/components/FeedsTab';
import styles from './page.module.css';
import { saveFoodLog } from '@/lib/log/save';
import type { LogMessage, ParseApiResponse, MealType, ParsedFoodItem } from '@/lib/log/types';
import { calculateChildProductScore, type ScoreBand } from '@/lib/nutrition/childProductScore';
import type { MealFavourite } from '@/app/api/log/meal-favourites/route';
import { STORAGE } from '@/lib/storage/keys';
import { ALL_ALLERGENS, ALLERGY_TRIGGER_REACTIONS } from '@/lib/allergens';
import AIDisclosure from '@/components/AIDisclosure';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'hydration'];

const REACTION_OPTIONS = [
  { label: 'Rash or redness',       bg: '#F5D4DC', color: '#8A3050' },
  { label: 'Hives (raised bumps)',   bg: '#F5D4DC', color: '#8A3050' },
  { label: 'Swollen lips or mouth',  bg: '#F5D4DC', color: '#8A3050' },
  { label: 'Itchy skin',             bg: '#F5D4DC', color: '#8A3050' },
  { label: 'Vomiting',               bg: '#FDE8C8', color: '#7A5020' },
  { label: 'Reflux',                 bg: '#FDE8C8', color: '#7A5020' },
  { label: 'Loose or runny stool',   bg: '#FDE8C8', color: '#7A5020' },
  { label: 'Constipation',           bg: '#FDE8C8', color: '#7A5020' },
  { label: 'Excessive wind',         bg: '#FDE8C8', color: '#7A5020' },
  { label: 'Unusually unsettled',    bg: '#EDE5F5', color: '#7A5B94' },
  { label: 'Refused the food',       bg: '#EDE5F5', color: '#7A5B94' },
]


const PORTION_OPTIONS = [
  { id: '1tsp',     label: '1 tsp',        value: 0.04, bg: '#EDE5F5', color: '#7A5B94' },
  { id: '1tbsp',    label: '1 tbsp',       value: 0.13, bg: '#EDE5F5', color: '#7A5B94' },
  { id: 'qtr',      label: '¼ cup',        value: 0.25, bg: '#F0D5C8', color: '#9E5035' },
  { id: 'half',     label: '½ cup',        value: 0.5,  bg: '#F0D5C8', color: '#9E5035' },
  { id: 'one',      label: '1 cup',        value: 1.0,  bg: '#F0D5C8', color: '#9E5035' },
  { id: 'onehalf',  label: '1½ cups',      value: 1.5,  bg: '#F0D5C8', color: '#9E5035' },
  { id: 'two',      label: '2 cups',       value: 2.0,  bg: '#F0D5C8', color: '#9E5035' },
  { id: 'sm-bowl',  label: 'Small bowl',   value: 0.5,  bg: '#D4E8D6', color: '#4A7050' },
  { id: 'md-bowl',  label: 'Medium bowl',  value: 1.0,  bg: '#D4E8D6', color: '#4A7050' },
  { id: 'lg-bowl',  label: 'Large bowl',   value: 1.5,  bg: '#D4E8D6', color: '#4A7050' },
  { id: 'sm-plate', label: 'Small plate',  value: 1.0,  bg: '#D4E4F0', color: '#3A6080' },
  { id: 'md-plate', label: 'Medium plate', value: 1.5,  bg: '#D4E4F0', color: '#3A6080' },
  { id: 'lg-plate', label: 'Large plate',  value: 2.0,  bg: '#D4E4F0', color: '#3A6080' },
]

const NUTRIENT_KEYS: (keyof ParsedFoodItem)[] = [
  'calories_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fibre_g',
  'sugar_g', 'saturated_fat_g', 'sodium_mg',
  'iron_mg', 'calcium_mg', 'vitamin_c_mg', 'vitamin_a_mcg', 'vitamin_d_mcg',
  'zinc_mg', 'omega3_mg', 'b12_mcg', 'b6_mg', 'folate_mcg', 'magnesium_mg',
  'potassium_mg', 'omega6_mg', 'iodine_mcg', 'selenium_mcg', 'phosphorus_mg',
  'choline_mg', 'dha_mg', 'vitamin_k_mcg',
]

function scaleItem(item: ParsedFoodItem, multiplier: number): ParsedFoodItem {
  if (multiplier === 1) return item
  const scaled = { ...item }
  for (const key of NUTRIENT_KEYS) {
    const v = scaled[key] as number | null
    if (v != null) (scaled as Record<string, unknown>)[key] = Math.round(v * multiplier * 100) / 100
  }
  return scaled
}
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  hydration: 'Hydration',
};

const MEAL_COLOURS: Record<MealType, string> = {
  breakfast: '#D4A72C',
  lunch:     '#7A9E7E',
  dinner:    '#C4714A',
  snack:     '#A67BC4',
  hydration: '#7AA5C4',
};

const MEAL_EXAMPLES: Record<MealType, string[]> = {
  breakfast:  ['Porridge with milk', 'Weetabix with banana', 'Toast with butter'],
  lunch:      ['Cheese sandwich and cucumber', 'Pasta with tomato sauce', 'Chicken wrap'],
  dinner:     ['Fish pie with peas', 'Chicken, rice and broccoli', 'Spaghetti bolognese'],
  snack:      ['Rice cake with peanut butter', 'Apple slices', 'Yoghurt'],
  hydration:  ['Water, about 150ml', 'Whole milk, half a cup', 'Diluted orange juice'],
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

const BAND_COLOURS: Record<ScoreBand, string> = {
  good: '#7A9E7E',
  ok:   '#D4A72C',
  poor: '#C85A5A',
};

const BAND_BG: Record<ScoreBand, string> = {
  good: '#EDF4EE',
  ok:   '#FBF4E0',
  poor: '#FAECEC',
};

function ProductScoreCard({ item, novaClass, additivesN, childAgeMonths, childName }: {
  item: ParsedFoodItem;
  novaClass: number | null;
  additivesN: number | null;
  childAgeMonths: number | null;
  childName: string | null;
}) {
  if (childAgeMonths == null) return null;
  const result = calculateChildProductScore({
    sugar_g: item.sugar_g,
    sodium_mg: item.sodium_mg,
    saturated_fat_g: item.saturated_fat_g,
    fibre_g: item.fibre_g,
    iron_mg: item.iron_mg,
    calcium_mg: item.calcium_mg,
    nova_classification: novaClass,
    additives_n: additivesN,
    child_age_days: Math.round(childAgeMonths * 30.44),
  });
  const colour = BAND_COLOURS[result.band];
  const bg = BAND_BG[result.band];
  return (
    <div className={styles.scoreCard} style={{ borderColor: colour, background: bg }}>
      <p className={styles.scoreCardLabel}>
        SHAi score{childName ? ` for ${childName}` : ''}'s age
      </p>
      <p className={styles.scoreCardNumber} style={{ color: colour }}>{result.score}</p>
      <p className={styles.scoreCardText}>{result.label}</p>
    </div>
  );
}

function FoodItemCard({ item, multiplier = 1, portionLabel, isWin, onWinToggle }: {
  item: ParsedFoodItem;
  multiplier?: number;
  portionLabel?: string | null;
  isWin?: boolean;
  onWinToggle?: () => void;
}) {
  const servingDesc = portionLabel ?? item.serving_size_description;
  return (
    <div className={styles.foodItem}>
      <div className={styles.foodItemTop}>
        <div className={styles.foodItemTitleRow}>
          <span className={styles.foodName}>{item.food_name}</span>
          {onWinToggle && (
            <button
              className={`${styles.winInlineBtn}${isWin ? ` ${styles.winInlineBtnActive}` : ''}`}
              onClick={onWinToggle}
              aria-label="Mark as a win"
              type="button"
            >
              🎉
            </button>
          )}
        </div>
        {servingDesc && (
          <span className={styles.serving}>{servingDesc}</span>
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
              {Math.round(raw * multiplier)}{unit} {label}
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
  const [activeTab, setActiveTab] = useState<MealType | 'feeds'>(() => {
    if (typeof window !== 'undefined') {
      const tab = sessionStorage.getItem('shai_log_tab');
      if (tab === 'feeds') { sessionStorage.removeItem('shai_log_tab'); return 'feeds'; }
    }
    return detectMealType();
  });
  const [feedsIsArchive, setFeedsIsArchive] = useState(false);
  const [childAgeMonths, setChildAgeMonths] = useState<number | null>(null);
  const [messages, setMessages] = useState<LogMessage[]>([
    { id: '0', role: 'assistant', content: "What did your little one have? The more detail the better — ingredients, type, and roughly how much." },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [phase, setPhase] = useState<Phase>('chatting');
  const [parsedData, setParsedData] = useState<ParseApiResponse | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [childValidated, setChildValidated] = useState(false);
  const [mealFavourites, setMealFavourites] = useState<MealFavourite[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [fromBarcode, setFromBarcode] = useState(false);
  const [barcodeScoreData, setBarcodeScoreData] = useState<{ novaClass: number | null; additivesN: number | null } | null>(null);
  const [portionSelection, setPortionSelection] = useState<string | null>(null);
  const selectedPortion = PORTION_OPTIONS.find(o => o.id === portionSelection) ?? null;
  const portionMultiplier = selectedPortion?.value ?? 1;
  const [reactions, setReactions] = useState<string[]>([]);
  const [noReaction, setNoReaction] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [allergyPromptActive, setAllergyPromptActive] = useState(false);
  const [allergyDismissed, setAllergyDismissed] = useState(false);
  const [allergyContextFoods, setAllergyContextFoods] = useState<string[]>([]);
  const [selectedAllergyFood, setSelectedAllergyFood] = useState<string | null>(null);
  const [allergyAdded, setAllergyAdded] = useState(false);
  const [childName, setChildName] = useState<string | null>(null);
  const [distressLevel, setDistressLevel] = useState<1 | 2 | 3 | null>(null);
  const [distressFlagId, setDistressFlagId] = useState<string | null>(null);
  const [consentStep, setConsentStep] = useState<'coparent' | 'support_person' | 'done' | null>(null);
  const [isWin, setIsWin] = useState(false);
  const [winNote, setWinNote] = useState('');
  const [showWinToast, setShowWinToast] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speechRef = useRef<ReturnType<typeof createSpeechRecognition> | null>(null);
  const [logListening, setLogListening] = useState(false);
  const [logCleaning, setLogCleaning] = useState(false);

  const [addSideOpen, setAddSideOpen] = useState(false);
  const [addSideInput, setAddSideInput] = useState('');
  const [addSideThinking, setAddSideThinking] = useState(false);
  const [fromFavourite, setFromFavourite] = useState(false);
  const [favouritesEditMode, setFavouritesEditMode] = useState(false);
  const [dismissedFavourites, setDismissedFavourites] = useState<Set<string>>(new Set());

  const loadQuickPicks = useCallback((meal: MealType) => {
    const key = STORAGE.dismissedFavourites(meal);
    const dismissed = JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
    setDismissedFavourites(new Set(dismissed));
    setFavouritesEditMode(false);
    fetch(`/api/log/meal-favourites?mealType=${meal}`)
      .then((r) => r.json())
      .then((json) => setMealFavourites(json.meals ?? []))
      .catch(() => {});
  }, []);

  const handleDismissFavourite = (name: string) => {
    const key = STORAGE.dismissedFavourites(mealType);
    const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
    const updated = Array.from(new Set([...existing, name]));
    localStorage.setItem(key, JSON.stringify(updated));
    setDismissedFavourites(new Set(updated));
  };

  async function handleAddSide() {
    const text = addSideInput.trim();
    if (!text || addSideThinking || !parsedData) return;
    setAddSideThinking(true);
    try {
      const res = await fetch('/api/log/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: text }], mealType }),
      });
      const data: ParseApiResponse = await res.json();
      if (data.foodItems?.length) {
        setParsedData({ ...parsedData, foodItems: [...parsedData.foodItems, ...data.foodItems] });
      }
    } catch { /* silently fail */ }
    setAddSideInput('');
    setAddSideOpen(false);
    setAddSideThinking(false);
  }

  const handleMealFavourite = (fav: MealFavourite) => {
    const foodItem: ParsedFoodItem = {
      food_name: fav.name,
      serving_size_description: null,
      calories_kcal: fav.calories_kcal, protein_g: fav.protein_g,
      carbs_g: fav.carbs_g, fat_g: fav.fat_g, fibre_g: fav.fibre_g,
      sugar_g: fav.sugar_g, saturated_fat_g: fav.saturated_fat_g, sodium_mg: fav.sodium_mg,
      iron_mg: fav.iron_mg, calcium_mg: fav.calcium_mg, vitamin_c_mg: fav.vitamin_c_mg,
      vitamin_a_mcg: fav.vitamin_a_mcg, vitamin_d_mcg: fav.vitamin_d_mcg,
      zinc_mg: fav.zinc_mg, omega3_mg: fav.omega3_mg, b12_mcg: fav.b12_mcg,
      b6_mg: fav.b6_mg, folate_mcg: fav.folate_mcg, magnesium_mg: fav.magnesium_mg,
      potassium_mg: fav.potassium_mg, omega6_mg: fav.omega6_mg,
      iodine_mcg: fav.iodine_mcg, selenium_mcg: fav.selenium_mcg,
      phosphorus_mg: fav.phosphorus_mg, choline_mg: fav.choline_mg,
      dha_mg: fav.dha_mg, vitamin_k_mcg: fav.vitamin_k_mcg,
      confidence_score: 0.9,
    };
    setPortionSelection(null);
    resetReactions();
    setFromFavourite(true);
    setParsedData({ message: '', foodItems: [foodItem], clarifyingQuestion: null, mealType, isHardFoodDay: false, complete: true });
    setPhase('confirming');
  };

  useEffect(() => {
    speechRef.current = createSpeechRecognition();
    return () => { speechRef.current?.stop(); };
  }, []);


  async function toggleLogDictation() {
    const speech = speechRef.current;
    if (!speech?.supported) return;
    if (logListening) {
      speech.stop();
      setLogListening(false);
      if (input.trim()) {
        setLogCleaning(true);
        try {
          const res = await fetch('/api/speech/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: input }),
          });
          const data = await res.json();
          if (data.text) setInput(data.text);
        } catch { /* keep original */ }
        setLogCleaning(false);
      }
      return;
    }
    setLogListening(true);
    speech.start(
      () => {},
      (final) => setInput(prev => prev + (prev.trimEnd() ? ' ' : '') + final),
      () => setLogListening(false),
      () => setLogListening(false),
    );
  }

  // Always resolve child from DB; localStorage is just a cache for same-device speed
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE.ACTIVE_CHILD_ID);
    fetch('/api/children')
      .then((r) => r.json())
      .then((json) => {
        if (json.childId) {
          localStorage.setItem(STORAGE.ACTIVE_CHILD_ID, json.childId);
          if (json.childName) localStorage.setItem(STORAGE.CHILD_NAME, json.childName);
          const name = json.childName ?? localStorage.getItem(STORAGE.CHILD_NAME);
          if (name) { setChildName(name); setMessages([{ id: '0', role: 'assistant', content: `What did ${name} have? The more detail the better — ingredients, type, and roughly how much.` }]); }
          if (json.childDob) {
            const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const parts = json.childDob.split(' ');
            const dobMonth = MONTHS.indexOf(parts[0]) + 1;
            const dobYear = parseInt(parts[1]);
            if (dobMonth > 0 && dobYear > 0) {
              const now = new Date();
              setChildAgeMonths((now.getFullYear() - dobYear) * 12 + (now.getMonth() + 1 - dobMonth));
            }
          }
          setChildValidated(true);
        } else {
          localStorage.removeItem(STORAGE.ACTIVE_CHILD_ID);
          localStorage.removeItem(STORAGE.CHILD_NAME);
          router.replace('/onboarding');
        }
      })
      .catch(() => {
        const name = localStorage.getItem(STORAGE.CHILD_NAME);
        if (name) { setChildName(name); setMessages([{ id: '0', role: 'assistant', content: `What did ${name} have? The more detail the better — ingredients, type, and roughly how much.` }]); }
        if (storedId) setChildValidated(true);
        else router.replace('/onboarding');
      });
  }, [router]);

  useEffect(() => {
    if (childValidated) loadQuickPicks(mealType);
  }, [mealType, childValidated, loadQuickPicks]);

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

  const handleDistressConsent = async (type: 'coparent' | 'support_person', given: boolean) => {
    if (distressFlagId) {
      fetch('/api/distress/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagId: distressFlagId, type, consentGiven: given }),
      }).catch(() => {});
    }
    setConsentStep(type === 'coparent' ? 'support_person' : 'done');
  };

  const toggleReaction = (r: string) => {
    setNoReaction(false);
    setReactions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  const toggleNoReaction = () => {
    setNoReaction(v => { if (!v) setReactions([]); return !v; });
  };

  const resetReactions = () => {
    setReactions([]); setNoReaction(false); setIsWin(false); setWinNote(''); setShowReactions(false);
    setAllergyPromptActive(false); setAllergyDismissed(false); setAllergyContextFoods([]); setSelectedAllergyFood(null); setAllergyAdded(false);
  };

  const handleBarcodeDetect = useCallback(async (barcode: string) => {
    setShowScanner(false);
    setIsThinking(true);
    try {
      const res = await fetch(`/api/barcode/lookup?barcode=${encodeURIComponent(barcode)}`);
      if (res.status === 404) {
        setMessages((prev) => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: "I couldn't find that product. Could you tell me what it is?",
        }]);
        return;
      }
      if (!res.ok) throw new Error('lookup failed');
      const { item, novaClass, additivesN } = await res.json();
      setPortionSelection(null);
      resetReactions();
      setFromBarcode(true);
      setBarcodeScoreData({ novaClass: novaClass ?? null, additivesN: additivesN ?? null });
      setParsedData({ message: '', foodItems: [item], clarifyingQuestion: null, mealType, isHardFoodDay: false, complete: true });
      setPhase('confirming');
    } catch {
      setMessages((prev) => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: "The scan didn't go through — could you describe the meal instead?",
      }]);
    } finally {
      setIsThinking(false);
    }
  }, [mealType]);

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
          ...(distressLevel === 3 && { distressActive: true }),
        }),
      });

      const data: ParseApiResponse = await res.json();

      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: 'assistant', content: data.message },
      ]);

      if (data.distressLevel) {
        setDistressLevel(data.distressLevel);
        if (data.distressLevel === 3 && data.distressFlagId) {
          setDistressFlagId(data.distressFlagId);
          setConsentStep('coparent');
        }
      }

      if (data.complete && !data.distressLevel) {
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

    let childId = localStorage.getItem(STORAGE.ACTIVE_CHILD_ID) ?? '';
    if (!childId) {
      const res = await fetch('/api/children');
      if (res.ok) {
        const json = await res.json();
        if (json.childId) {
          childId = json.childId;
          localStorage.setItem(STORAGE.ACTIVE_CHILD_ID, json.childId);
          if (json.childName) localStorage.setItem(STORAGE.CHILD_NAME, json.childName);
        }
      }
    }

    const reactionType = noReaction ? ['no_reaction'] : reactions.length ? reactions : null;

    const { error } = await saveFoodLog(
      childId,
      parsedData.foodItems.map((item) => scaleItem(item, portionMultiplier)),
      parsedData.mealType,
      parsedData.isHardFoodDay,
      reactionType,
      isWin,
      winNote.trim() || null,
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
    localStorage.removeItem(STORAGE.dailyFeedback(today));
    localStorage.removeItem(STORAGE.weeklySummary(monday));

    if (ALLERGY_TRIGGER_REACTIONS.some(r => reactions.includes(r)) && parsedData) {
      setAllergyPromptActive(true);
      setAllergyContextFoods(parsedData.foodItems.map(f => f.food_name));
    }

    setPhase('saved');
    loadQuickPicks(mealType);
  };

  const handleEdit = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const fallback = parsedData?.foodItems?.[0]?.food_name ?? '';
    setParsedData(null);
    setPortionSelection(null);
    resetReactions();
    setAddSideOpen(false);
    setAddSideInput('');
    setFromFavourite(false);
    setFromBarcode(false);
    setBarcodeScoreData(null);
    setPhase('chatting');
    setInput(lastUserMsg?.content ?? fallback);
    setMessages([{ id: generateId(), role: 'assistant', content: "No problem — what would you like to change?" }]);
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  async function handleAddAllergy() {
    if (!selectedAllergyFood) return;
    await fetch('/api/children', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addAllergy: selectedAllergyFood }),
    });
    setAllergyAdded(true);
  }

  const handleLogAnother = () => {
    setPortionSelection(null);
    resetReactions();
    setAddSideOpen(false);
    setAddSideInput('');
    setFromFavourite(false);
    setFromBarcode(false);
    setBarcodeScoreData(null);
    const name = localStorage.getItem(STORAGE.CHILD_NAME);
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
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      {showScanner && (
        <BarcodeScanner onDetect={handleBarcodeDetect} onClose={() => setShowScanner(false)} />
      )}

      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push('/home')} aria-label="Back to home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        {phase === 'chatting' && activeTab !== 'feeds' && (
          <button className={styles.hardDayBtn} onClick={handleHardFoodDay}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M15 12H4.5a3.5 3.5 0 0 1 0-7A5 5 0 0 1 15 7.5a4.5 4.5 0 0 1 0 4.5z"/>
              <rect x="4" y="13.5" width="1.5" height="3.5" rx="0.75" transform="rotate(-20 4 13.5)"/>
              <rect x="8.5" y="13.5" width="1.5" height="3.5" rx="0.75" transform="rotate(-20 8.5 13.5)"/>
              <rect x="13" y="13.5" width="1.5" height="3.5" rx="0.75" transform="rotate(-20 13 13.5)"/>
            </svg>
            Hard day
          </button>
        )}
      </div>

      {/* ── Meal type tabs ── */}
      <div className={styles.tabsRow}>
        <button
          className={`${styles.tab} ${activeTab === 'feeds' ? styles.tabActive : ''}`}
          style={activeTab === 'feeds'
            ? { background: '#7AA5C4', borderColor: '#7AA5C4' }
            : { borderColor: '#7AA5C4', color: '#7AA5C4' }
          }
          onClick={() => setActiveTab('feeds')}
        >
          {feedsIsArchive ? 'Feeding chapter' : 'Feeds'}
        </button>
        {MEAL_TYPES.map((type) => (
          <button
            key={type}
            className={`${styles.tab} ${activeTab === type ? styles.tabActive : ''}`}
            style={activeTab === type
              ? { background: MEAL_COLOURS[type], borderColor: MEAL_COLOURS[type] }
              : { borderColor: MEAL_COLOURS[type] }
            }
            onClick={() => {
              if (phase === 'saving' || activeTab === type) return;
              setActiveTab(type);
              setMealType(type);
              setParsedData(null);
              setPortionSelection(null);
              resetReactions();
              setAddSideOpen(false);
              setAddSideInput('');
              setFromFavourite(false);
              setFromBarcode(false);
              setBarcodeScoreData(null);
              setPhase('chatting');
              setMessages([{ id: generateId(), role: 'assistant', content: "What did your little one have? The more detail the better — ingredients, type, and roughly how much." }]);
            }}
            disabled={phase === 'saving'}
          >
            {MEAL_LABELS[type]}
          </button>
        ))}
      </div>

      {activeTab === 'feeds' ? <FeedsTab onArchiveChange={setFeedsIsArchive} /> : (<>

      {/* ── Meal favourites ── */}
      {phase === 'chatting' && mealFavourites.filter(f => !dismissedFavourites.has(f.name)).length > 0 && (
        <div className={styles.favouritesSection}>
          <div className={styles.favouritesHeader}>
            <p className={styles.favouritesLabel}><span className={styles.favouritesIcon}>😋</span> Favourites</p>
            <button
              className={`${styles.favouritesEditBtn}${favouritesEditMode ? ` ${styles.favouritesEditBtnActive}` : ''}`}
              onClick={() => setFavouritesEditMode(m => !m)}
            >
              {favouritesEditMode ? 'Done' : 'Edit'}
            </button>
          </div>
          <div className={styles.favouritesChips}>
            {mealFavourites.filter(f => !dismissedFavourites.has(f.name)).map((fav) => (
              <div key={fav.name} className={styles.favouriteChipWrap}>
                {favouritesEditMode && (
                  <button className={styles.favouriteDismiss} onClick={() => handleDismissFavourite(fav.name)} aria-label="Remove">✕</button>
                )}
                <button
                  className={styles.favouriteChip}
                  onClick={() => !favouritesEditMode && handleMealFavourite(fav)}
                >
                  {fav.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <AIDisclosure />

      {/* ── Messages ── */}
      <div className={`${styles.messages} ${messages.length <= 1 && phase === 'chatting' ? styles.messagesStart : ''} ${phase === 'chatting' ? styles.messagesChat : ''} ${distressLevel === 3 ? styles.messagesWithCard : ''}`}>
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className={`${styles.row} ${msg.role === 'user' ? styles.rowUser : styles.rowAssistant}`}
          >
            {msg.role === 'assistant' && (
              <SHAiPresence expression="default" size={28} />
            )}
            <div className={`${styles.bubble} ${msg.role === 'assistant' ? styles.bubbleAssistant : styles.bubbleUser}`}>
              {msg.content}
              {msg.role === 'assistant' && distressLevel === 2 && i === messages.length - 1 && (
                <a href="tel:179" className={styles.supportLineChip}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.06-1.06a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  Supportline Malta · 179
                </a>
              )}
            </div>
          </div>
        ))}

        {messages.length === 1 && phase === 'chatting' && (
          <div className={styles.exampleHint}>
            <p className={styles.exampleLabel}>For example</p>
            <div className={styles.exampleChips}>
              {MEAL_EXAMPLES[mealType].map((ex) => (
                <button
                  key={ex}
                  className={styles.exampleChip}
                  style={{ borderColor: MEAL_COLOURS[mealType], color: MEAL_COLOURS[mealType] }}
                  onClick={() => setInput(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

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

      {/* ── Level 3 — sticky 179 card ── */}
      {distressLevel === 3 && (
        <div className={styles.distressCard}>
          <div className={styles.distressCardText}>
            <p className={styles.distressCardTitle}>You don&apos;t have to face this alone.</p>
            <p className={styles.distressCardSub}>Free · Confidential · 24/7</p>
          </div>
          <a href="tel:179" className={styles.call179Btn}>
            Call 179
          </a>
        </div>
      )}

      {/* ── Level 3 — in-moment consent ── */}
      {distressLevel === 3 && consentStep && consentStep !== 'done' && (
        <div className={styles.consentCard}>
          <p className={styles.consentText}>
            {consentStep === 'coparent'
              ? 'We can quietly let your partner know you might need some support right now. Is that OK?'
              : 'We can also reach out to your named support person. Would that be OK?'}
          </p>
          <div className={styles.consentBtns}>
            <button className={styles.consentYes} onClick={() => handleDistressConsent(consentStep, true)}>
              Yes, reach out
            </button>
            <button className={styles.consentNo} onClick={() => handleDistressConsent(consentStep, false)}>
              Not now
            </button>
          </div>
        </div>
      )}

      {/* ── Chat input ── */}
      {phase === 'chatting' && (
        <div className={styles.inputWrap}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder={logCleaning ? 'Tidying up…' : 'Describe the meal…'}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={logCleaning}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button
            className={styles.barcodeBtn}
            onClick={() => setShowScanner(true)}
            aria-label="Scan barcode"
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="3" height="16" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="7" y="4" width="1.5" height="16" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="10.5" y="4" width="3" height="16" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="15.5" y="4" width="1.5" height="16" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="19" y="4" width="3" height="16" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button
            className={`${styles.micBtn}${(logListening || logCleaning) ? ` ${styles.micBtnActive}` : ''}`}
            onClick={toggleLogDictation}
            disabled={logCleaning}
            aria-label={logListening ? 'Stop dictation' : 'Dictate meal'}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="9" y1="23" x2="15" y2="23" />
            </svg>
          </button>
          <button
            className={styles.sendBtn}
            onClick={sendMessage}
            disabled={!input.trim() || isThinking || logCleaning}
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
            <>
              {showWinToast && isWin && (
                <div className={styles.winToast}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--sage-dark)" stroke="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Win added to your jar!
                </div>
              )}

              {fromBarcode && barcodeScoreData && parsedData.foodItems[0] && (
                <ProductScoreCard
                  item={parsedData.foodItems[0]}
                  novaClass={barcodeScoreData.novaClass}
                  additivesN={barcodeScoreData.additivesN}
                  childAgeMonths={childAgeMonths}
                  childName={childName}
                />
              )}

              <div className={styles.foodList}>
                {parsedData.foodItems.map((item, i) => (
                  <FoodItemCard
                    key={i}
                    item={item}
                    multiplier={portionMultiplier}
                    portionLabel={selectedPortion?.label}
                    isWin={isWin}
                    onWinToggle={() => {
                      setIsWin(w => {
                        if (!w) {
                          setShowWinToast(true);
                          setShowConfetti(true);
                          setTimeout(() => setShowWinToast(false), 2200);
                        }
                        return !w;
                      });
                      setWinNote('');
                    }}
                  />
                ))}
              </div>

              {fromFavourite && addSideOpen ? (
                <div className={styles.addSideRow}>
                  <input
                    className={styles.addSideInput}
                    placeholder="e.g. handful of broccoli"
                    value={addSideInput}
                    onChange={(e) => setAddSideInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddSide(); }}
                    autoFocus
                    autoComplete="off"
                    disabled={addSideThinking}
                  />
                  <button className={styles.addSideBtn} onClick={handleAddSide} disabled={!addSideInput.trim() || addSideThinking}>
                    {addSideThinking ? '…' : 'Add'}
                  </button>
                  <button className={styles.addSideCancel} onClick={() => { setAddSideOpen(false); setAddSideInput(''); }}>✕</button>
                </div>
              ) : fromFavourite ? (
                <button className={styles.addSideTrigger} onClick={() => setAddSideOpen(true)} disabled={phase === 'saving'}>
                  + Add a side
                </button>
              ) : null}

              <div className={styles.portionRow}>
                <span className={styles.portionLabel}>Meal portion</span>
                {PORTION_OPTIONS.map(({ id, label, bg, color }) => (
                  <button
                    key={id}
                    className={`${styles.portionChip}${portionSelection === id ? ` ${styles.portionChipActive}` : ''}`}
                    style={portionSelection !== id ? { background: bg, color } : undefined}
                    onClick={() => setPortionSelection(portionSelection === id ? null : id)}
                    disabled={phase === 'saving'}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {parsedData.mealType !== 'hydration' && (
                <>
                  <button
                    className={`${styles.reactionToggle}${(reactions.length > 0 || noReaction) ? ` ${styles.reactionToggleActive}` : ''}`}
                    onClick={() => setShowReactions(v => !v)}
                    disabled={phase === 'saving'}
                  >
                    {reactions.length > 0
                      ? `${reactions.length} reaction${reactions.length !== 1 ? 's' : ''} noted`
                      : noReaction
                      ? 'No reaction noted'
                      : 'Any reaction?'}
                  </button>
                  {showReactions && (
                    <div className={styles.reactionSection}>
                      <div className={styles.reactionChips}>
                        {REACTION_OPTIONS.map(({ label, bg, color }) => (
                          <button
                            key={label}
                            className={`${styles.reactionChip}${reactions.includes(label) ? ` ${styles.reactionChipActive}` : ''}`}
                            style={!reactions.includes(label) ? { background: bg, color } : undefined}
                            onClick={() => toggleReaction(label)}
                            disabled={phase === 'saving'}
                          >
                            {label}
                          </button>
                        ))}
                        <button
                          className={`${styles.reactionChip}${noReaction ? ` ${styles.reactionChipNone}` : ''}`}
                          onClick={toggleNoReaction}
                          disabled={phase === 'saving'}
                        >
                          No reaction
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {isWin && (
            <input
              className={styles.winNoteInput}
              placeholder="Add a note (optional) — e.g. tried broccoli for the first time!"
              value={winNote}
              onChange={(e) => setWinNote(e.target.value)}
              autoComplete="off"
              disabled={phase === 'saving'}
            />
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
              {parsedData?.isHardFoodDay
                ? "Noted. You're doing great."
                : isWin
                ? 'Congratulations! Win added to your jar.'
                : 'All logged!'}
            </p>
          </div>

          {allergyPromptActive && !allergyAdded && (
            <div className={styles.allergyPrompt}>
              {!allergyDismissed && (
                <>
                  {allergyContextFoods.length > 0 && (
                    <p className={styles.allergyContextText}>You logged: {allergyContextFoods.join(', ')}</p>
                  )}
                  <p className={styles.allergyPromptText}>Which ingredient caused the reaction?</p>
                  <div className={styles.allergyFoodChips}>
                    {ALL_ALLERGENS.map(allergen => (
                      <button
                        key={allergen}
                        className={`${styles.allergyChip}${selectedAllergyFood === allergen.toLowerCase() ? ` ${styles.allergyChipActive}` : ''}`}
                        onClick={() => setSelectedAllergyFood(allergen.toLowerCase())}
                      >
                        {allergen}
                      </button>
                    ))}
                  </div>
                  <div className={styles.allergyBtns}>
                    <button
                      className={styles.allergyConfirmBtn}
                      onClick={handleAddAllergy}
                      disabled={!selectedAllergyFood}
                    >
                      Add to allergy list
                    </button>
                    <button className={styles.allergySkipBtn} onClick={() => setAllergyDismissed(true)}>
                      Not sure yet
                    </button>
                  </div>
                </>
              )}
              <p className={styles.allergyHintText}>The reaction is already saved. You can update {childName ? `${childName}'s` : `your little one's`} allergy list in their profile anytime.</p>
              <p className={styles.allergyGuidanceText}>According to NHS Start4Life guidance, it&apos;s worth avoiding the food until you&apos;ve had a chance to speak to your GP — especially if this is the first time you&apos;ve seen this reaction.</p>
            </div>
          )}

          {allergyAdded && (
            <p className={styles.allergyAddedText}>
              {selectedAllergyFood} added to {childName ? `${childName}'s` : `your little one's`} allergy list.
            </p>
          )}

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
      </>)}
    </div>
  );
}
