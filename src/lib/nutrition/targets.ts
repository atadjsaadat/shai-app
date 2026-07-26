export interface Targets {
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fibre_g: number
  sugar_g: number
  sodium_mg: number
  iron_mg: number
}

// WHO / NHS UK reference values by age band
export function getTargets(ageMonths: number): Targets {
  if (ageMonths < 7)  return { calories_kcal: 700,  protein_g: 10, carbs_g: 75,  fat_g: 30, fibre_g: 5,  sugar_g: 8,  sodium_mg: 320,  iron_mg: 11 }
  if (ageMonths < 13) return { calories_kcal: 800,  protein_g: 11, carbs_g: 90,  fat_g: 35, fibre_g: 5,  sugar_g: 10, sodium_mg: 400,  iron_mg: 11 }
  if (ageMonths < 37) return { calories_kcal: 1200, protein_g: 15, carbs_g: 130, fat_g: 40, fibre_g: 15, sugar_g: 25, sodium_mg: 800,  iron_mg: 7  }
  if (ageMonths < 73) return { calories_kcal: 1500, protein_g: 20, carbs_g: 210, fat_g: 55, fibre_g: 20, sugar_g: 18, sodium_mg: 1200, iron_mg: 6  }
  return               { calories_kcal: 1800, protein_g: 28, carbs_g: 260, fat_g: 70, fibre_g: 25, sugar_g: 24, sodium_mg: 2000, iron_mg: 9  }
}
