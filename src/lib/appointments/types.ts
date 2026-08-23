export type AppointmentType =
  | 'gp'
  | 'paediatrician'
  | 'health_visitor'
  | 'dentist'
  | 'hospital'
  | 'specialist'
  | 'vaccination'
  | 'other'

export interface Appointment {
  id: string
  child_id: string
  user_id: string
  appointment_type: AppointmentType | null
  title: string
  scheduled_at: string
  location: string | null
  notes: string | null
  attended: boolean | null
  created_at: string
  updated_at: string
}

export interface CreateAppointmentInput {
  title: string
  appointment_type: AppointmentType | null
  scheduled_at: string
  location?: string
  notes?: string
}

export interface UpdateAppointmentInput {
  title?: string
  appointment_type?: AppointmentType | null
  scheduled_at?: string
  location?: string | null
  notes?: string | null
  attended?: boolean | null
}

export const TYPE_LABELS: Record<AppointmentType, string> = {
  gp: 'GP',
  paediatrician: 'Paediatrician',
  health_visitor: 'Health Visitor',
  dentist: 'Dentist',
  hospital: 'Hospital',
  specialist: 'Specialist',
  vaccination: 'Vaccination',
  other: 'Other',
}

export const APPOINTMENT_COLOR = '#7AA5C4'
