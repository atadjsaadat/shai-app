// Wonder Weeks leap timings from Plooij's published academic research (public domain).
// NHS Start4Life milestone heads-ups use NHS open government licence data.
// Messages use [name] placeholder — replaced at render time with child's name.
// AI personalisation (Sonnet) to be added post clinical sign-off.

export interface DevelopmentalEvent {
  id: number;
  type: 'wonder_weeks' | 'nhs_milestone';
  peakWeek: number;
  name: string;
  shaiMessage: string;
}

export const DEVELOPMENTAL_EVENTS: DevelopmentalEvent[] = [
  // ── Wonder Weeks (weeks from due date) ──────────────────────────────────
  {
    id: 1, type: 'wonder_weeks', peakWeek: 5,
    name: 'Leap 1',
    shaiMessage: 'Around 5 weeks, [name] may become more aware of the world and go through a fussier, clingier phase. Extra cuddles and patience are all they need. It passes quickly, and something wonderful comes out the other side.',
  },
  {
    id: 2, type: 'wonder_weeks', peakWeek: 8,
    name: 'Leap 2',
    shaiMessage: '[name] is approaching a big developmental moment — around 8 weeks, babies start recognising simple patterns in the world. You might notice more fussiness or disrupted sleep over the next couple of weeks. Completely normal, and it won\'t last.',
  },
  {
    id: 3, type: 'wonder_weeks', peakWeek: 12,
    name: 'Leap 3',
    shaiMessage: 'Around 12 weeks, [name] will start experiencing the world more fluidly — sounds, movements, and textures all becoming more connected. There\'s often a fussier phase just before this leap. If feeding feels off or sleep gets a bit rocky, that\'s likely why.',
  },
  {
    id: 4, type: 'wonder_weeks', peakWeek: 19,
    name: 'Leap 4',
    shaiMessage: 'One of the bigger leaps is coming for [name] — around 19 weeks, babies start to understand that things happen in sequences. It\'s a huge brain moment, and it can bring some unsettled days beforehand. Worth knowing about in advance.',
  },
  {
    id: 5, type: 'wonder_weeks', peakWeek: 26,
    name: 'Leap 5',
    shaiMessage: 'Around 26 weeks, [name] will begin to grasp that people and objects exist even when out of sight. Separation anxiety can show up here for the first time. A bit clingy, a bit fussier — all completely expected, and a sign of healthy development.',
  },
  {
    id: 6, type: 'wonder_weeks', peakWeek: 37,
    name: 'Leap 6',
    shaiMessage: 'Around 37 weeks, [name] will start sorting the world into categories — a big one. Fussiness and clinginess often peak just before this leap, and appetite can go a little haywire. It\'s temporary, and the playfulness that follows is worth it.',
  },
  {
    id: 7, type: 'wonder_weeks', peakWeek: 46,
    name: 'Leap 7',
    shaiMessage: 'Around 46 weeks, [name] starts to understand that actions have a goal and a sequence. You might notice more frustration as [name] figures out what they\'re trying to do. Normal, healthy, and it does pass.',
  },
  {
    id: 8, type: 'wonder_weeks', peakWeek: 55,
    name: 'Leap 8',
    shaiMessage: 'Around 55 weeks, [name] will start to become a little problem-solver — grasping flexible programs of action. The lead-up can bring some fussiness and disrupted nights. Knowing it\'s a leap rather than something wrong makes all the difference.',
  },
  {
    id: 9, type: 'wonder_weeks', peakWeek: 64,
    name: 'Leap 9',
    shaiMessage: 'Around 64 weeks, [name] starts to understand principles like patience and fairness. It can feel like a regression behaviourally for a while — it isn\'t. It\'s growth, and it\'s a big one.',
  },
  {
    id: 10, type: 'wonder_weeks', peakWeek: 75,
    name: 'Leap 10',
    shaiMessage: 'Around 75 weeks, [name] begins to understand how systems work and how they fit into them. It\'s a big emotional leap too. Some clinginess and big feelings in the lead-up are completely normal.',
  },
  // ── NHS Start4Life milestone heads-ups ───────────────────────────────────
  {
    id: 101, type: 'nhs_milestone', peakWeek: 7,
    name: '6–8 week check',
    shaiMessage: '[name]\'s NHS 6–8 week check is coming up soon. A great moment to talk through anything on your mind — feeding, sleep, your own wellbeing. According to NHS Start4Life guidance, this check covers [name]\'s physical development and your recovery too.',
  },
  {
    id: 102, type: 'nhs_milestone', peakWeek: 16,
    name: '4-month milestone',
    shaiMessage: '[name] is approaching 4 months — a big developmental moment. Babies often become much more alert and interactive around now. Sleep can also shift around this age, according to NHS Start4Life guidance. Completely normal if it does.',
  },
  {
    id: 103, type: 'nhs_milestone', peakWeek: 28,
    name: '6-month milestone',
    shaiMessage: '[name] is nearly 6 months — according to NHS Start4Life guidance, this is typically when families begin introducing solid foods alongside milk. No rush, no pressure. SHAi will be here for every step whenever you\'re ready.',
  },
  {
    id: 104, type: 'nhs_milestone', peakWeek: 52,
    name: '12-month milestone',
    shaiMessage: '[name] is nearly 1 — according to NHS Start4Life guidance, this is when the transition to family foods and a cup for drinks begins. A huge milestone, and you\'ve done brilliantly to get here.',
  },
];

// Surface when 14–21 days before the peak (2–3 weeks ahead)
const ALERT_DAYS_MIN = 14;
const ALERT_DAYS_MAX = 21;

export function getUpcomingEvent(
  ageInDays: number,
  eventsSurfaced: number[],
): { event: DevelopmentalEvent; daysUntil: number } | null {
  for (const event of DEVELOPMENTAL_EVENTS) {
    if (eventsSurfaced.includes(event.id)) continue;
    const peakDays = event.peakWeek * 7;
    const daysUntil = peakDays - ageInDays;
    if (daysUntil >= ALERT_DAYS_MIN && daysUntil <= ALERT_DAYS_MAX) {
      return { event, daysUntil };
    }
  }
  return null;
}
