export type MilestoneType =
  // Social & Emotional
  | 'first_smile'
  | 'first_laugh'
  | 'waves_bye_bye'
  | 'plays_with_others'
  | 'shows_affection'
  | 'social_special'
  // Language & Communication
  | 'first_babble'
  | 'first_word'
  | 'points_to_things'
  | 'two_word_phrase'
  | 'follows_instructions'
  | 'language_special'
  // Cognitive
  | 'object_permanence'
  | 'name_recognition'
  | 'imaginative_play'
  | 'problem_solving'
  | 'cognitive_special'
  // Movement & Physical Development
  | 'rolling_over'
  | 'sitting'
  | 'crawling'
  | 'standing'
  | 'first_steps'
  | 'first_tooth'
  | 'first_jump'
  | 'running'
  | 'movement_special'
  // Adaptive Behaviour
  | 'first_food'
  | 'first_sleep_through'
  | 'uses_spoon'
  | 'drinks_from_cup'
  | 'first_haircut'
  | 'potty_trained'
  | 'adaptive_special'
  // Legacy (not shown in picker)
  | 'something_special'

export type Domain =
  | 'social_emotional'
  | 'language_communication'
  | 'cognitive'
  | 'movement_physical'
  | 'adaptive_behaviour'

export const DOMAINS: Domain[] = [
  'social_emotional',
  'language_communication',
  'cognitive',
  'movement_physical',
  'adaptive_behaviour',
]

export const DOMAIN_LABELS: Record<Domain, string> = {
  social_emotional:       'Feelings',
  language_communication: 'First Words',
  cognitive:              'Learning',
  movement_physical:      'Moving',
  adaptive_behaviour:     'Growing Up',
}

export const DOMAIN_COLORS: Record<Domain, { bg: string; text: string }> = {
  social_emotional:       { bg: '#D4E8D6', text: '#4A7050' },
  language_communication: { bg: '#F0D5C8', text: '#9E5035' },
  cognitive:              { bg: '#D0E4F0', text: '#2E5C7A' },
  movement_physical:      { bg: '#F5E8C0', text: '#7A5810' },
  adaptive_behaviour:     { bg: '#EAD4F0', text: '#6A3590' },
}

export const DOMAIN_MILESTONES: Record<Domain, MilestoneType[]> = {
  social_emotional:       ['first_smile', 'first_laugh', 'waves_bye_bye', 'plays_with_others', 'shows_affection', 'social_special'],
  language_communication: ['first_babble', 'first_word', 'points_to_things', 'two_word_phrase', 'follows_instructions', 'language_special'],
  cognitive:              ['object_permanence', 'name_recognition', 'imaginative_play', 'problem_solving', 'cognitive_special'],
  movement_physical:      ['rolling_over', 'sitting', 'crawling', 'standing', 'first_steps', 'first_tooth', 'first_jump', 'running', 'movement_special'],
  adaptive_behaviour:     ['first_food', 'first_sleep_through', 'uses_spoon', 'drinks_from_cup', 'first_haircut', 'potty_trained', 'adaptive_special'],
}

export const MILESTONE_TO_DOMAIN: Record<string, Domain> = {
  first_smile:          'social_emotional',
  first_laugh:          'social_emotional',
  waves_bye_bye:        'social_emotional',
  plays_with_others:    'social_emotional',
  shows_affection:      'social_emotional',
  social_special:       'social_emotional',
  something_special:    'social_emotional',
  first_babble:         'language_communication',
  first_word:           'language_communication',
  points_to_things:     'language_communication',
  two_word_phrase:      'language_communication',
  follows_instructions: 'language_communication',
  language_special:     'language_communication',
  object_permanence:    'cognitive',
  name_recognition:     'cognitive',
  imaginative_play:     'cognitive',
  problem_solving:      'cognitive',
  cognitive_special:    'cognitive',
  rolling_over:         'movement_physical',
  sitting:              'movement_physical',
  crawling:             'movement_physical',
  standing:             'movement_physical',
  first_steps:          'movement_physical',
  first_tooth:          'movement_physical',
  first_jump:           'movement_physical',
  running:              'movement_physical',
  movement_special:     'movement_physical',
  first_food:           'adaptive_behaviour',
  first_sleep_through:  'adaptive_behaviour',
  uses_spoon:           'adaptive_behaviour',
  drinks_from_cup:      'adaptive_behaviour',
  first_haircut:        'adaptive_behaviour',
  potty_trained:        'adaptive_behaviour',
  adaptive_special:     'adaptive_behaviour',
}

export const MILESTONE_LABELS: Record<string, string> = {
  first_smile:          'First smile',
  first_laugh:          'First laugh',
  waves_bye_bye:        'Waved bye-bye',
  plays_with_others:    'Played with others',
  shows_affection:      'Showed affection',
  social_special:       'Something else',
  first_babble:         'First babble',
  first_word:           'First word',
  points_to_things:     'Pointed to things',
  two_word_phrase:      'Two-word phrase',
  follows_instructions: 'Followed instructions',
  language_special:     'Something else',
  object_permanence:    'Found a hidden toy',
  name_recognition:     'Responded to their name',
  imaginative_play:     'Imaginative play',
  problem_solving:      'Solved a puzzle',
  cognitive_special:    'Something else',
  rolling_over:         'Rolled over',
  sitting:              'Sat up unaided',
  crawling:             'Started crawling',
  standing:             'Pulled to standing',
  first_steps:          'First steps',
  first_tooth:          'First tooth',
  first_jump:           'First jump',
  running:              'Started running',
  movement_special:     'Something else',
  first_food:           'First food',
  first_sleep_through:  'First night through',
  uses_spoon:           'Used a spoon',
  drinks_from_cup:      'Drank from a cup',
  first_haircut:        'First haircut',
  potty_trained:        'Potty trained',
  adaptive_special:     'Something else',
  something_special:    'Something else',
}

export interface BabyBookEntry {
  id: string
  child_id: string
  logged_by_user_id: string
  milestone_date: string
  milestone_type: string
  title: string
  note: string | null
  child_age_days: number | null
  created_at: string
}

export interface CreateMilestoneInput {
  milestone_date: string
  milestone_type: string
  title: string
  note?: string
}

export interface UpdateMilestoneInput {
  milestone_date?: string
  milestone_type?: string
  title?: string
  note?: string | null
}

// Typical age in months for each milestone (ESPGHAN/WHO/NHS reference — used for "coming up" nudges)
export const MILESTONE_AGE_MONTHS: Partial<Record<MilestoneType, number>> = {
  first_smile:          2,
  first_sleep_through:  3,
  first_laugh:          4,
  rolling_over:         5,
  first_babble:         6,
  first_food:           6,
  object_permanence:    7,
  first_tooth:          7,
  sitting:              8,
  name_recognition:     8,
  crawling:             9,
  waves_bye_bye:        9,
  standing:             11,
  first_steps:          12,
  first_word:           12,
  points_to_things:     12,
  first_haircut:        12,
  drinks_from_cup:      13,
  shows_affection:      14,
  uses_spoon:           15,
  running:              18,
  follows_instructions: 18,
  two_word_phrase:      21,
  first_jump:           24,
  imaginative_play:     24,
  problem_solving:      24,
  plays_with_others:    30,
  potty_trained:        30,
}
