export type MilestoneType =
  | 'first_smile'
  | 'first_laugh'
  | 'first_word'
  | 'first_steps'
  | 'first_food'
  | 'first_tooth'
  | 'crawling'
  | 'sitting'
  | 'first_haircut'
  | 'first_sleep_through'
  | 'something_special'

export interface BabyBookEntry {
  id: string
  child_id: string
  logged_by_user_id: string
  milestone_date: string
  milestone_type: MilestoneType
  title: string
  note: string | null
  child_age_days: number | null
  created_at: string
}

export interface CreateMilestoneInput {
  milestone_date: string
  milestone_type: MilestoneType
  title: string
  note?: string
}

export interface UpdateMilestoneInput {
  milestone_date?: string
  milestone_type?: MilestoneType
  title?: string
  note?: string | null
}

export const MILESTONE_LABELS: Record<MilestoneType, string> = {
  first_smile:         'First smile',
  first_laugh:         'First laugh',
  first_word:          'First word',
  first_steps:         'First steps',
  first_food:          'First food',
  first_tooth:         'First tooth',
  crawling:            'Started crawling',
  sitting:             'Started sitting up',
  first_haircut:       'First haircut',
  first_sleep_through: 'First night through',
  something_special:   'Something special',
}

export const MILESTONE_TYPES = Object.keys(MILESTONE_LABELS) as MilestoneType[]
