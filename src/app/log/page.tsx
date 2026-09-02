'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { createSpeechRecognition } from '@/lib/speech/recognition';
import { useRouter, useSearchParams } from 'next/navigation';
import SHAiPresence from '@/components/SHAiPresence';
import Confetti from '@/components/Confetti';
import FeedsTab from '@/components/FeedsTab';
import styles from './page.module.css';
import { saveFoodLog } from '@/lib/log/save';
import type { LogMessage, ParseApiResponse, MealType, ParsedFoodItem } from '@/lib/log/types';
import { calculateChildProductScore, type ScoreBand } from '@/lib/nutrition/childProductScore';
import type { MealFavourite } from '@/app/api/log/meal-favourites/route';
import { STORAGE } from '@/lib/storage/keys';
import { ALL_ALLERGENS, ALLERGY_TRIGGER_REACTIONS } from '@/lib/allergens';
import AIDisclosure from '@/components/AIDisclosure';

async function compressImage(file: File, maxBytes = 800_000): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX_DIM = 1600
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      const tryEncode = (quality: number) => {
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        const base64 = dataUrl.split(',')[1]
        if (base64.length * 0.75 < maxBytes || quality <= 0.3) {
          resolve({ base64, mediaType: 'image/jpeg' })
        } else {
          tryEncode(quality - 0.15)
        }
      }
      tryEncode(0.85)
    }
    img.src = url
  })
}

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

const MEAL_CHIP_BG: Record<MealType, string> = {
  breakfast: '#FBF3DC',
  lunch:     '#D4E8D6',
  dinner:    '#F0D5C8',
  snack:     '#E4D8F0',
  hydration: '#D0E4F0',
};

const MEAL_CHIP_TEXT: Record<MealType, string> = {
  breakfast: '#7A5810',
  lunch:     '#4A7050',
  dinner:    '#9E5035',
  snack:     '#5A3F80',
  hydration: '#2E5C7A',
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

function getMealParam(): MealType | null {
  if (typeof window === 'undefined') return null;
  const meal = new URLSearchParams(window.location.search).get('meal');
  return meal && (MEAL_TYPES as readonly string[]).includes(meal) ? (meal as MealType) : null;
}

type Phase = 'chatting' | 'confirming' | 'saving' | 'saved';

function shortenName(name: string): string {
  const commaIdx = name.indexOf(',');
  const short = commaIdx !== -1 ? name.slice(0, commaIdx) : name;
  return short.length > 30 ? short.slice(0, 27).trimEnd() + '…' : short;
}

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

function FoodItemCard({ item, multiplier = 1, portionLabel, isWin, onWinToggle, isPinned, onPinToggle }: {
  item: ParsedFoodItem;
  multiplier?: number;
  portionLabel?: string | null;
  isWin?: boolean;
  onWinToggle?: () => void;
  isPinned?: boolean;
  onPinToggle?: () => void;
}) {
  const servingDesc = portionLabel ?? item.serving_size_description;
  return (
    <div className={styles.foodItem}>
      <div className={styles.foodItemTop}>
        <div className={styles.foodItemTitleRow}>
          <span className={styles.foodName}>{item.food_name}</span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {onPinToggle && (
              <button
                className={`${styles.pinInlineBtn}${isPinned ? ` ${styles.pinInlineBtnActive}` : ''}`}
                onClick={onPinToggle}
                aria-label={isPinned ? 'Remove from favourites' : 'Add to favourites'}
                type="button"
              >
                ♥
              </button>
            )}
            {onWinToggle && (
              <button
                className={`${styles.winInlineBtn}${isWin ? ` ${styles.winInlineBtnActive}` : ''}`}
                onClick={onWinToggle}
                aria-label="Mark as a win"
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
                  <polygon points="12,2 15.82,6.74 21.51,8.91 18.18,14.01 17.88,20.09 12,18.5 6.12,20.09 5.82,14.01 2.49,8.91 8.18,6.74"/>
                </svg>
              </button>
            )}
          </div>
        </div>
        {servingDesc && (
          <span className={styles.serving}>{servingDesc}</span>
        )}
      </div>
      {item.data_source === 'ai' ? (
        <p className={styles.estimatedNote}>Nutritional values are estimated — actual amounts may vary</p>
      ) : (
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
      )}
    </div>
  );
}

function LogPage() {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>(detectMealType);
  const [activeTab, setActiveTab] = useState<MealType | 'feeds'>(detectMealType);
  const [editMealItems, setEditMealItems] = useState<Array<{ food_name: string; calories_kcal: number | null }> | null>(null);
  const [editLogIds, setEditLogIds] = useState<string[]>([]);
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
  const [fromBarcode, setFromBarcode] = useState(false);
  const [barcodeScoreData, setBarcodeScoreData] = useState<{ novaClass: number | null; additivesN: number | null } | null>(null);
  const [pendingBarcodeItem, setPendingBarcodeItem] = useState<{ item: ParsedFoodItem; novaClass: number | null; additivesN: number | null } | null>(null);
  const [portionSelection, setPortionSelection] = useState<string | null>(null);
  const [barcodeGrams, setBarcodeGrams] = useState<string>('');
  const selectedPortion = PORTION_OPTIONS.find(o => o.id === portionSelection) ?? null;
  const activeItem = parsedData?.foodItems[0] ?? null;
  const activeDesc = activeItem?.serving_size_description ?? '';
  const isBarcodePer100g = fromBarcode && (!activeDesc || activeDesc === '100g' || activeDesc === 'per 100g');
  const portionMultiplier = isBarcodePer100g
    ? (parseFloat(barcodeGrams) || 100) / 100
    : (selectedPortion?.value ?? 1);
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
  const confettiFiredRef = useRef(false);
  const labelPhotoInputRef = useRef<HTMLInputElement>(null);
  const [showLabelPhotoBtn, setShowLabelPhotoBtn] = useState(false);
  const searchParams = useSearchParams();
  const logDate = searchParams.get('date');

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
  const [pinnedFavourites, setPinnedFavourites] = useState<Map<string, MealFavourite>>(new Map());
  const [pendingPinItem, setPendingPinItem] = useState<ParsedFoodItem | null>(null);
  const [pinNamePhase, setPinNamePhase] = useState<'confirm' | 'custom' | null>(null);
  const [customPinName, setCustomPinName] = useState('');

  const loadQuickPicks = useCallback((meal: MealType) => {
    const key = STORAGE.dismissedFavourites(meal);
    const dismissed = JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
    setDismissedFavourites(new Set(dismissed));
    setFavouritesEditMode(false);
    const pinnedRaw: MealFavourite[] = JSON.parse(localStorage.getItem(STORAGE.pinnedFavourites(meal)) ?? '[]');
    setPinnedFavourites(new Map(pinnedRaw.map(f => [(f.foods[0] ?? f.name).toLowerCase().trim(), f])));
    setMealFavourites([]);
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
    const pinnedKey = STORAGE.pinnedFavourites(mealType);
    const existingPinned: MealFavourite[] = JSON.parse(localStorage.getItem(pinnedKey) ?? '[]');
    const norm = name.toLowerCase().trim();
    const updatedPinned = existingPinned.filter(f => f.name.toLowerCase().trim() !== norm);
    localStorage.setItem(pinnedKey, JSON.stringify(updatedPinned));
    setPinnedFavourites(new Map(updatedPinned.map(f => [(f.foods[0] ?? f.name).toLowerCase().trim(), f])));
  };

  const handlePinToggle = (item: ParsedFoodItem) => {
    const norm = item.food_name.toLowerCase().trim();
    const isAlreadyPinned = pinnedFavourites.has(norm);
    if (isAlreadyPinned) {
      const pinnedKey = STORAGE.pinnedFavourites(mealType);
      const existing: MealFavourite[] = JSON.parse(localStorage.getItem(pinnedKey) ?? '[]');
      const updated = existing.filter(f => (f.foods[0] ?? f.name).toLowerCase().trim() !== norm);
      localStorage.setItem(pinnedKey, JSON.stringify(updated));
      setPinnedFavourites(new Map(updated.map(f => [(f.foods[0] ?? f.name).toLowerCase().trim(), f])));
    } else {
      setPendingPinItem(item);
      setCustomPinName(shortenName(item.food_name));
      setPinNamePhase('confirm');
    }
  };

  const completePinWithName = (displayName: string) => {
    if (!pendingPinItem) return;
    const name = displayName.trim() || shortenName(pendingPinItem.food_name);
    const pinnedKey = STORAGE.pinnedFavourites(mealType);
    const existing: MealFavourite[] = JSON.parse(localStorage.getItem(pinnedKey) ?? '[]');
    const updated: MealFavourite[] = [{ name, foods: [pendingPinItem.food_name], use_count: 0,
      calories_kcal: pendingPinItem.calories_kcal, protein_g: pendingPinItem.protein_g, carbs_g: pendingPinItem.carbs_g,
      fat_g: pendingPinItem.fat_g, fibre_g: pendingPinItem.fibre_g, sugar_g: pendingPinItem.sugar_g,
      saturated_fat_g: pendingPinItem.saturated_fat_g, sodium_mg: pendingPinItem.sodium_mg, iron_mg: pendingPinItem.iron_mg,
      calcium_mg: pendingPinItem.calcium_mg, vitamin_c_mg: pendingPinItem.vitamin_c_mg, vitamin_a_mcg: pendingPinItem.vitamin_a_mcg,
      vitamin_d_mcg: pendingPinItem.vitamin_d_mcg, zinc_mg: pendingPinItem.zinc_mg, omega3_mg: pendingPinItem.omega3_mg,
      b12_mcg: pendingPinItem.b12_mcg, b6_mg: pendingPinItem.b6_mg, folate_mcg: pendingPinItem.folate_mcg,
      magnesium_mg: pendingPinItem.magnesium_mg, potassium_mg: pendingPinItem.potassium_mg, omega6_mg: pendingPinItem.omega6_mg,
      iodine_mcg: pendingPinItem.iodine_mcg, selenium_mcg: pendingPinItem.selenium_mcg, phosphorus_mg: pendingPinItem.phosphorus_mg,
      choline_mg: pendingPinItem.choline_mg, dha_mg: pendingPinItem.dha_mg, vitamin_k_mcg: pendingPinItem.vitamin_k_mcg,
    }, ...existing];
    localStorage.setItem(pinnedKey, JSON.stringify(updated));
    setPinnedFavourites(new Map(updated.map(f => [(f.foods[0] ?? f.name).toLowerCase().trim(), f])));
    setPendingPinItem(null);
    setPinNamePhase(null);
    setCustomPinName('');
  };

  const cancelPin = () => {
    setPendingPinItem(null);
    setPinNamePhase(null);
    setCustomPinName('');
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
      food_name: fav.foods[0] ?? fav.name,
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
    const meal = getMealParam();
    if (meal) {
      setActiveTab(meal);
      setMealType(meal);
    } else {
      const tab = sessionStorage.getItem('shai_log_tab');
      if (tab === 'feeds') { sessionStorage.removeItem('shai_log_tab'); setActiveTab('feeds'); }
    }
  }, []);

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

  // Handle "Log it now" from the scan page — product data already fetched, skip lookup
  useEffect(() => {
    const stored = sessionStorage.getItem('shai_scan_to_log');
    if (!stored) return;
    sessionStorage.removeItem('shai_scan_to_log');
    try {
      const { item, novaClass, additivesN } = JSON.parse(stored);
      if (item) {
        setPortionSelection(null);
        setBarcodeGrams('');
        resetReactions();
        setFromBarcode(true);
        setBarcodeScoreData({ novaClass: novaClass ?? null, additivesN: additivesN ?? null });
        setParsedData({ message: '', foodItems: [item], clarifyingQuestion: null, mealType, isHardFoodDay: false, complete: true });
        setPhase('confirming');
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get('labelPhoto') === '1') {
      setShowLabelPhotoBtn(true);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: "That barcode isn't in our database yet — take a photo of the nutrition label and I'll read it, or just describe the product.",
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem('shai_edit_meal');
    if (!stored) return;
    sessionStorage.removeItem('shai_edit_meal');
    try {
      const data = JSON.parse(stored);
      if (Array.isArray(data.items) && data.items.length > 0) {
        setEditMealItems(data.items);
        setEditLogIds(data.items.map((i: { id?: string }) => i.id).filter(Boolean));
        setInput(data.items.map((i: { food_name: string }) => i.food_name).join(', '));
      }
    } catch {}
  }, []);

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
    setReactions([]); setNoReaction(false); setIsWin(false); setWinNote(''); setShowReactions(false); confettiFiredRef.current = false;
    setAllergyPromptActive(false); setAllergyDismissed(false); setAllergyContextFoods([]); setSelectedAllergyFood(null); setAllergyAdded(false);
  };

  const handleBarcodeDetect = useCallback(async (barcode: string) => {
    setIsThinking(true);
    try {
      const res = await fetch(`/api/barcode/lookup?barcode=${encodeURIComponent(barcode)}`);
      if (res.status === 404) {
        setMessages((prev) => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: "I couldn't find that one. You can photo the nutrition label and I'll read it, or just describe it.",
        }]);
        setShowLabelPhotoBtn(true);
        return;
      }
      if (!res.ok) throw new Error('lookup failed');
      const { item, novaClass, additivesN, brand } = await res.json();
      const enriched = { ...item, barcode, brand: brand ?? null, nova_classification: novaClass ?? null, additives_n: additivesN ?? null };
      const displayName = [brand, item.food_name].filter(Boolean).join(' ');
      setPortionSelection(null);
      resetReactions();
      setPendingBarcodeItem({ item: enriched, novaClass: novaClass ?? null, additivesN: additivesN ?? null });
      setMessages((prev) => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `I found ${displayName} — is that the one you're logging?`,
      }]);
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

  const confirmBarcodeItem = useCallback(() => {
    if (!pendingBarcodeItem) return;
    setFromBarcode(true);
    setBarcodeScoreData({ novaClass: pendingBarcodeItem.novaClass, additivesN: pendingBarcodeItem.additivesN });
    setParsedData({ message: '', foodItems: [pendingBarcodeItem.item], clarifyingQuestion: null, mealType, isHardFoodDay: false, complete: true });
    setPhase('confirming');
    setPendingBarcodeItem(null);
  }, [pendingBarcodeItem, mealType]);

  const rejectBarcodeItem = useCallback(() => {
    setPendingBarcodeItem(null);
    setMessages((prev) => [...prev, {
      id: generateId(),
      role: 'assistant',
      content: "No problem — could you describe it, or scan a different one?",
    }]);
  }, []);

  const handleLabelPhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setShowLabelPhotoBtn(false);
    setIsThinking(true);
    try {
      const { base64, mediaType } = await compressImage(file);
      const res = await fetch('/api/barcode/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      if (!res.ok) throw new Error('read failed');
      const { item } = await res.json();
      const hasName = item.food_name && item.food_name !== 'Scanned product';
      setPortionSelection(null);
      setReactions([]); setNoReaction(false); setIsWin(false); setWinNote('');
      setShowReactions(false); confettiFiredRef.current = false;
      setAllergyPromptActive(false); setAllergyDismissed(false);
      setAllergyContextFoods([]); setSelectedAllergyFood(null); setAllergyAdded(false);
      setPendingBarcodeItem({ item, novaClass: null, additivesN: null });
      setMessages((prev) => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: hasName
          ? `I read the label — found ${item.food_name}. Does that look right?`
          : "I read the label and pulled the nutritional information. Does that look right?",
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: "I couldn't read the label clearly — could you describe the product instead?",
      }]);
    } finally {
      setIsThinking(false);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking || phase !== 'chatting') return;

    const userMsg: LogMessage = { id: generateId(), role: 'user', content: text };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput('');
    setShowLabelPhotoBtn(false);
    setIsThinking(true);
    textareaRef.current?.focus(); // sync — keeps iOS keyboard open

    try {
      const res = await fetch('/api/log/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          mealType,
          childId: localStorage.getItem(STORAGE.ACTIVE_CHILD_ID) ?? undefined,
          ...(distressLevel === 3 && { distressActive: true }),
          ...(editMealItems && { alreadyLogged: editMealItems }),
        }),
      });

      let data: ParseApiResponse = await res.json();

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
        // Check for barcode/pantry match
        try {
          const matchRes = await fetch('/api/barcode/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ foodNames: data.foodItems.map((i: { food_name: string }) => i.food_name) }),
          });
          if (matchRes.ok) {
            const { matches } = await matchRes.json();
            const firstKey = Object.keys(matches)[0];
            if (firstKey && matches[firstKey]) {
              const match = matches[firstKey];
              const resetState = () => {
                setPortionSelection(null);
                setReactions([]); setNoReaction(false); setIsWin(false); setWinNote('');
                setShowReactions(false); confettiFiredRef.current = false;
                setAllergyPromptActive(false); setAllergyDismissed(false);
                setAllergyContextFoods([]); setSelectedAllergyFood(null); setAllergyAdded(false);
              };
              resetState();
              // Only use barcode match nutrition if the stored item actually has calories
              // If null (sparse OFF data), fall through and keep AI-estimated nutrition from data
              if (match.item.calories_kcal != null) {
                setBarcodeScoreData({ novaClass: match.novaClass ?? null, additivesN: match.additivesN ?? null });
                setParsedData({ ...data, foodItems: [match.item] });
                setPhase('confirming');
                return;
              }
              // Null nutrition in pantry — set score data only, keep AI estimate
              setBarcodeScoreData({ novaClass: match.novaClass ?? null, additivesN: match.additivesN ?? null });
            }
          }
        } catch { /* fallback to AI estimate */ }
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

    const loggedAt = logDate ? new Date(logDate + 'T12:00:00').toISOString() : undefined;
    const { error } = await saveFoodLog(
      childId,
      parsedData.foodItems.map((item) => scaleItem(item, portionMultiplier)),
      parsedData.mealType,
      parsedData.isHardFoodDay,
      reactionType,
      isWin,
      winNote.trim() || null,
      editLogIds.length > 0 ? editLogIds : undefined,
      loggedAt,
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
    sessionStorage.setItem('shai_trends_stale', '1');

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

      {/* ── Past date banner ── */}
      {logDate && (
        <div className={styles.logDateBanner}>
          Logging for {new Date(logDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
        </div>
      )}

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
      {(() => {
        const pinnedList = Array.from(pinnedFavourites.values()).filter(f => !dismissedFavourites.has(f.name));
        const apiList = mealFavourites.filter(f => !dismissedFavourites.has(f.name) && !pinnedFavourites.has(f.name.toLowerCase().trim()));
        const displayFavourites = [...pinnedList, ...apiList];
        if (phase !== 'chatting' || displayFavourites.length === 0) return null;
        return (
          <div className={styles.favouritesSection}>
            <div className={styles.favouritesHeader}>
              <p className={styles.favouritesLabel}><span className={styles.favouritesIcon}>♥</span> Favourites</p>
              <button
                className={`${styles.favouritesEditBtn}${favouritesEditMode ? ` ${styles.favouritesEditBtnActive}` : ''}`}
                onClick={() => setFavouritesEditMode(m => !m)}
              >
                {favouritesEditMode ? 'Done' : 'Edit'}
              </button>
            </div>
            <div className={styles.favouritesChips}>
              {displayFavourites.map((fav) => {
                const isPinnedChip = pinnedFavourites.has((fav.foods[0] ?? fav.name).toLowerCase().trim());
                const chipBg = MEAL_CHIP_BG[mealType];
                const chipText = MEAL_CHIP_TEXT[mealType];
                const chipBorder = MEAL_COLOURS[mealType];
                return (
                  <div key={fav.name} className={styles.favouriteChipWrap}>
                    {favouritesEditMode && (
                      <button className={styles.favouriteDismiss} onClick={() => handleDismissFavourite(fav.name)} aria-label="Remove">✕</button>
                    )}
                    <button
                      className={`${styles.favouriteChip}${isPinnedChip ? ` ${styles.favouriteChipPinned}` : ''}`}
                      style={{ background: chipBg, borderColor: chipBorder, color: chipText }}
                      onClick={() => !favouritesEditMode && handleMealFavourite(fav)}
                    >
                      {isPinnedChip && <span className={styles.favouriteChipStar}>♥</span>}
                      {shortenName(fav.name)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <AIDisclosure />

      {/* ── Messages ── */}
      <div className={`${styles.messages} ${messages.length <= 1 && phase === 'chatting' ? styles.messagesStart : ''} ${phase === 'chatting' ? styles.messagesChat : ''} ${distressLevel === 3 ? styles.messagesWithCard : ''}`}>

        {editMealItems && phase === 'chatting' && (
          <div className={styles.alreadyLogged}>
            <p className={styles.alreadyLoggedLabel}>Already logged</p>
            <div className={styles.alreadyLoggedItems}>
              {editMealItems.map((item, i) => (
                <span key={i} className={styles.alreadyLoggedItem}>{item.food_name}</span>
              ))}
            </div>
            <button className={styles.alreadyLoggedDismiss} onClick={() => setEditMealItems(null)} aria-label="Dismiss">×</button>
            {editLogIds.length > 0 && (
              <button
                className={styles.deleteEntryBtn}
                onClick={async () => {
                  const childId = localStorage.getItem('shai_active_child_id');
                  if (!childId) return;
                  await fetch('/api/log/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ logIds: editLogIds, childId }),
                  });
                  router.push('/home');
                }}
              >
                Delete this entry
              </button>
            )}
          </div>
        )}

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

        {pendingBarcodeItem && !isThinking && phase === 'chatting' && (
          <div className={styles.barcodeConfirmRow}>
            <button className={styles.barcodeConfirmYes} onClick={confirmBarcodeItem}>
              Yes, log it
            </button>
            <button className={styles.barcodeConfirmNo} onClick={rejectBarcodeItem}>
              Not this one
            </button>
          </div>
        )}

        {showLabelPhotoBtn && !isThinking && phase === 'chatting' && (
          <div className={styles.barcodeConfirmRow}>
            <button className={styles.labelPhotoBtn} onClick={() => labelPhotoInputRef.current?.click()}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Photo the label
            </button>
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
            autoCorrect="on"
            spellCheck
          />
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

              {fromBarcode && barcodeScoreData && parsedData.foodItems[0] &&
               parsedData.foodItems[0].calories_kcal != null &&
               parsedData.foodItems[0].data_source !== 'ai' && (
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
                      const next = !isWin;
                      setIsWin(next);
                      setWinNote('');
                      if (next && !confettiFiredRef.current) {
                        confettiFiredRef.current = true;
                        setShowWinToast(true);
                        setShowConfetti(true);
                        setTimeout(() => setShowWinToast(false), 2200);
                      }
                    }}
                    isPinned={pinnedFavourites.has(item.food_name.toLowerCase().trim())}
                    onPinToggle={() => handlePinToggle(item)}
                  />
                ))}
              </div>

              {pendingPinItem && pinNamePhase === 'confirm' && (
                <div className={styles.pinNamePrompt}>
                  <p className={styles.pinNameText}>Save as &ldquo;{shortenName(pendingPinItem.food_name)}&rdquo;?</p>
                  <div className={styles.pinNameBtns}>
                    <button className={styles.pinNameYes} onClick={() => completePinWithName(shortenName(pendingPinItem.food_name))}>Yes</button>
                    <button className={styles.pinNameNo} onClick={() => setPinNamePhase('custom')}>Rename</button>
                    <button className={styles.pinNameCancel} onClick={cancelPin}>✕</button>
                  </div>
                </div>
              )}

              {pendingPinItem && pinNamePhase === 'custom' && (
                <div className={styles.pinNamePrompt}>
                  <input
                    className={styles.pinNameInput}
                    value={customPinName}
                    onChange={(e) => setCustomPinName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && customPinName.trim()) completePinWithName(customPinName); }}
                    placeholder="e.g. Pasta night"
                    autoFocus
                    autoComplete="off"
                  />
                  <div className={styles.pinNameBtns}>
                    <button className={styles.pinNameYes} onClick={() => completePinWithName(customPinName)} disabled={!customPinName.trim()}>Save</button>
                    <button className={styles.pinNameCancel} onClick={cancelPin}>✕</button>
                  </div>
                </div>
              )}

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

              {isBarcodePer100g ? (
                <div className={styles.portionRow}>
                  <span className={styles.portionLabel}>How much did they have?</span>
                  <div className={styles.gramInputWrap}>
                    <button className={styles.gramBtn} onClick={() => setBarcodeGrams(g => String(Math.max(1, (parseInt(g) || 0) - 5)))} disabled={phase === 'saving'}>−</button>
                    <input
                      className={styles.gramInput}
                      type="number"
                      min="1"
                      value={barcodeGrams}
                      onChange={e => setBarcodeGrams(e.target.value)}
                      placeholder="100"
                      disabled={phase === 'saving'}
                    />
                    <span className={styles.gramUnit}>g</span>
                    <button className={styles.gramBtn} onClick={() => setBarcodeGrams(g => String((parseInt(g) || 0) + 5))} disabled={phase === 'saving'}>+</button>
                  </div>
                </div>
              ) : (
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
              )}
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
      <input
        ref={labelPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.hiddenInput}
        onChange={handleLabelPhoto}
      />
    </div>
  );
}

export default function LogPageWrapper() {
  return <Suspense><LogPage /></Suspense>;
}
