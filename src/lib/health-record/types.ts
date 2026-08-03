export interface VaccineDef {
  key: string
  name: string
  covers: string
}

export interface VaccineGroup {
  label: string
  month: number
  vaccines: VaccineDef[]
}

export interface VaccinationRecord {
  vaccine_key: string
  given_date: string | null
  notes: string | null
}

export const VACCINE_SCHEDULE: VaccineGroup[] = [
  {
    label: 'At birth',
    month: 0,
    vaccines: [
      { key: 'hepb_birth', name: 'Hepatitis B', covers: 'Birth dose' },
    ],
  },
  {
    label: '2 months',
    month: 2,
    vaccines: [
      { key: 'hexavalent_1', name: '6-in-1', covers: 'Diphtheria, Tetanus, Pertussis, Polio, Hib, Hepatitis B — 1st dose' },
      { key: 'pcv_1',        name: 'Pneumococcal (PCV)', covers: '1st dose' },
      { key: 'rotavirus_1',  name: 'Rotavirus', covers: '1st dose' },
      { key: 'menb_1',       name: 'Meningococcal B', covers: '1st dose' },
    ],
  },
  {
    label: '4 months',
    month: 4,
    vaccines: [
      { key: 'hexavalent_2', name: '6-in-1', covers: '2nd dose' },
      { key: 'pcv_2',        name: 'Pneumococcal (PCV)', covers: '2nd dose' },
      { key: 'rotavirus_2',  name: 'Rotavirus', covers: '2nd dose' },
      { key: 'menb_2',       name: 'Meningococcal B', covers: '2nd dose' },
    ],
  },
  {
    label: '6 months',
    month: 6,
    vaccines: [
      { key: 'hexavalent_3', name: '6-in-1', covers: '3rd dose' },
      { key: 'rotavirus_3',  name: 'Rotavirus', covers: '3rd dose' },
    ],
  },
  {
    label: '12 months',
    month: 12,
    vaccines: [
      { key: 'mmr_1',       name: 'MMR', covers: 'Measles, Mumps, Rubella — 1st dose' },
      { key: 'pcv_3',       name: 'Pneumococcal (PCV)', covers: 'Booster' },
      { key: 'menb_3',      name: 'Meningococcal B', covers: 'Booster' },
      { key: 'menc_1',      name: 'Meningococcal C', covers: '1st dose' },
      { key: 'varicella_1', name: 'Varicella', covers: 'Chickenpox — 1st dose' },
    ],
  },
  {
    label: '15 months',
    month: 15,
    vaccines: [
      { key: 'mmr_2',       name: 'MMR', covers: '2nd dose' },
      { key: 'varicella_2', name: 'Varicella', covers: 'Chickenpox — 2nd dose' },
    ],
  },
  {
    label: '5–6 years',
    month: 60,
    vaccines: [
      { key: 'dtap_ipv_preschool', name: 'DTaP-IPV', covers: 'Pre-school booster — Diphtheria, Tetanus, Pertussis, Polio' },
    ],
  },
  {
    label: '11–12 years',
    month: 132,
    vaccines: [
      { key: 'hpv_1',       name: 'HPV', covers: '1st dose' },
      { key: 'hpv_2',       name: 'HPV', covers: '2nd dose (6 months after 1st)' },
      { key: 'dtap_ipv_teen', name: 'dTap-IPV', covers: 'Teenage booster' },
      { key: 'menc_teen',   name: 'Meningococcal ACWY', covers: 'Teenage booster' },
    ],
  },
]
