// Los "intereses" para segmentación ahora son los rubros reales del sitio
// (Category) — se validan contra la base con getValidCategorySlugs(), no
// contra una lista fija acá, para que un rubro nuevo se sume solo.

export const AGE_RANGES = [
  { value: 'R18_24', label: '18 a 24 años' },
  { value: 'R25_34', label: '25 a 34 años' },
  { value: 'R35_44', label: '35 a 44 años' },
  { value: 'R45_54', label: '45 a 54 años' },
  { value: 'R55_64', label: '55 a 64 años' },
  { value: 'R65_PLUS', label: '65 años o más' },
] as const

export const GENDERS = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'OTHER', label: 'Otro' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefiero no decir' },
] as const

export const INCOME_LEVELS = [
  { value: 'LOW', label: 'Ingresos bajos' },
  { value: 'MEDIUM', label: 'Ingresos medios' },
  { value: 'HIGH', label: 'Ingresos altos' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefiero no decir' },
] as const
