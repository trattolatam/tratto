// Validación de identificadores fiscales por país — misma lógica que el backend
// (src/services/taxIdValidation.ts), verificada contra librerías npm reales.
// Se duplica acá para dar feedback instantáneo en el formulario sin ida y vuelta al servidor.

export interface TaxIdValidationResult {
  formatValid: boolean
  checksumValid: boolean | null // null = el país no tiene checksum implementado (ej. México)
}

function onlyDigits(v: string): string {
  return v.replace(/\D/g, '')
}

function validateUY(raw: string): TaxIdValidationResult {
  const rut = onlyDigits(raw)
  if (rut.length !== 12) return { formatValid: false, checksumValid: false }
  const digitC = parseInt(rut.substring(11, 12))
  const rest = rut.substring(0, 11)
  let total = 0
  let factor = 2
  for (let i = 10; i >= 0; i--) {
    total += factor * parseInt(rest.substring(i, i + 1))
    factor = factor === 9 ? 2 : factor + 1
  }
  let digitV = 11 - (total % 11)
  if (digitV === 11) digitV = 0
  else if (digitV === 10) digitV = 1
  return { formatValid: true, checksumValid: digitV === digitC }
}

function validateAR(raw: string): TaxIdValidationResult {
  const cuit = onlyDigits(raw)
  if (cuit.length !== 11) return { formatValid: false, checksumValid: false }
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let total = 0
  for (let i = 0; i < 10; i++) total += parseInt(cuit[i]) * weights[i]
  let checkDigit = 11 - (total % 11)
  if (checkDigit === 11) checkDigit = 0
  if (checkDigit === 10) return { formatValid: true, checksumValid: false }
  return { formatValid: true, checksumValid: checkDigit === parseInt(cuit[10]) }
}

function validateCL(raw: string): TaxIdValidationResult {
  const clean = raw.replace(/[^0-9kK]/g, '')
  if (clean.length < 2) return { formatValid: false, checksumValid: false }
  const digits = clean.slice(0, -1)
  const verifier = clean.slice(-1).toLowerCase()
  if (!/^\d+$/.test(digits)) return { formatValid: false, checksumValid: false }
  let sum = 0
  let mul = 2
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i]) * mul
    mul = mul === 7 ? 2 : mul + 1
  }
  const res = sum % 11
  const expected = res === 0 ? '0' : res === 1 ? 'k' : String(11 - res)
  return { formatValid: true, checksumValid: verifier === expected }
}

function validateCO(raw: string): TaxIdValidationResult {
  const nit = onlyDigits(raw)
  if (nit.length !== 9 && nit.length !== 10) return { formatValid: false, checksumValid: false }
  const multipliers = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
  const digit = nit[nit.length - 1]
  const sequence = nit.slice(0, -1).split('').reverse()
  let v = 0
  for (let i = 0; i < sequence.length; i++) v += parseInt(sequence[i]) * multipliers[i]
  let check = v % 11
  if (check >= 2) check = 11 - check
  return { formatValid: true, checksumValid: check === parseInt(digit) }
}

function validatePE(raw: string): TaxIdValidationResult {
  const ruc = onlyDigits(raw)
  if (ruc.length !== 11) return { formatValid: false, checksumValid: false }
  if (!/^(10|15|16|17|20)/.test(ruc)) return { formatValid: false, checksumValid: false }
  const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let total = 0
  for (let i = 0; i < factors.length; i++) total += parseInt(ruc[i]) * factors[i]
  const verifier = 11 - (total % 11)
  return { formatValid: true, checksumValid: parseInt(ruc[10]) === verifier % 10 }
}

function cnpjCheckDigit(base: string): number {
  let sum = 0
  let weight = base.length === 12 ? 5 : 6
  for (let i = 0; i < base.length; i++) {
    sum += (base.charCodeAt(i) - 48) * weight
    weight = weight === 2 ? 9 : weight - 1
  }
  const mod = sum % 11
  return mod < 2 ? 0 : 11 - mod
}
function validateBR(raw: string): TaxIdValidationResult {
  const cnpj = raw.toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (cnpj.length !== 14) return { formatValid: false, checksumValid: false }
  const blacklist = new Set(['00000000000000', '11111111111111', '22222222222222', '33333333333333', '44444444444444', '55555555555555', '66666666666666', '77777777777777', '88888888888888', '99999999999999'])
  if (blacklist.has(cnpj)) return { formatValid: true, checksumValid: false }
  if (!/^\d{2}$/.test(cnpj.slice(-2))) return { formatValid: false, checksumValid: false }
  const base12 = cnpj.slice(0, 12)
  const d1 = cnpjCheckDigit(base12)
  const d2 = cnpjCheckDigit(base12 + d1)
  return { formatValid: true, checksumValid: cnpj.slice(12) === `${d1}${d2}` }
}

function validateMX(raw: string): TaxIdValidationResult {
  const rfc = raw.toUpperCase().replace(/[^A-ZÑ&0-9]/g, '')
  const RFC_REGEX = /^([A-ZÑ&]{3,4})(\d{2})(0[1-9]|1[0-2])(0[1-9]|1[0-9]|2[0-9]|3[0-1])([A-Z0-9]{3})?$/
  return { formatValid: RFC_REGEX.test(rfc), checksumValid: null }
}

const VALIDATORS: Record<string, (raw: string) => TaxIdValidationResult> = {
  UY: validateUY, AR: validateAR, CL: validateCL, CO: validateCO, PE: validatePE, BR: validateBR, MX: validateMX,
}

export function validateTaxId(country: string, taxId: string): TaxIdValidationResult {
  const validator = VALIDATORS[country.toUpperCase()]
  if (!validator) return { formatValid: true, checksumValid: null }
  return validator(taxId)
}

function validateCPF(raw: string): TaxIdValidationResult {
  const cpf = onlyDigits(raw)
  if (cpf.length !== 11) return { formatValid: false, checksumValid: false }
  const blacklist = new Set(['00000000000', '11111111111', '22222222222', '33333333333', '44444444444', '55555555555', '66666666666', '77777777777', '88888888888', '99999999999', '12345678909'])
  if (blacklist.has(cpf)) return { formatValid: true, checksumValid: false }
  const digit = (base: string): number => {
    let sum = 0
    const n = base.length
    for (let i = n - 1; i >= 0; i--) sum += (base.charCodeAt(i) - 48) * (n - i + 1)
    const mod = sum % 11
    return mod < 2 ? 0 : 11 - mod
  }
  const base9 = cpf.slice(0, 9)
  const d1 = digit(base9)
  const d2 = digit(base9 + d1)
  return { formatValid: true, checksumValid: cpf.slice(9) === `${d1}${d2}` }
}

const PERSONAL_ID_VALIDATORS: Record<string, (raw: string) => TaxIdValidationResult> = {
  CL: validateCL,
  BR: validateCPF,
}

export function validatePersonalId(country: string, idNumber: string): TaxIdValidationResult {
  const validator = PERSONAL_ID_VALIDATORS[country.toUpperCase()]
  if (!validator) return { formatValid: true, checksumValid: null }
  return validator(idNumber)
}
