import { parsePhoneNumberFromString, isValidPhoneNumber, CountryCode } from 'libphonenumber-js'

/**
 * Valida y normaliza un número de teléfono contra el país elegido, usando
 * las reglas reales de numeración de cada país (libphonenumber-js, la misma
 * base de datos que usa Google/Android) — en vez de reglas hechas a mano
 * país por país, que son una fuente clásica de bugs (Brasil, por ejemplo,
 * agrega un "9" a los celulares que Uruguay no tiene).
 *
 * Devuelve el número en formato E.164 (+59897550450) listo para guardar y
 * para armar links de wa.me/tel: directamente, o un error legible si no es
 * válido para ese país.
 */
export function validateAndNormalizePhone(rawNumber: string, countryCode: string): { valid: true; e164: string } | { valid: false; message: string } {
  const country = countryCode as CountryCode

  if (!isValidPhoneNumber(rawNumber, country)) {
    return { valid: false, message: `Ingresá un número de teléfono válido para ${countryCode}.` }
  }

  const parsed = parsePhoneNumberFromString(rawNumber, country)
  if (!parsed) {
    return { valid: false, message: `Ingresá un número de teléfono válido para ${countryCode}.` }
  }

  return { valid: true, e164: parsed.number } // parsed.number ya viene en formato E.164
}
